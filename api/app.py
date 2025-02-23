import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import boto3
import uuid
from openai import OpenAI
import json
from datetime import datetime
import lxml.html
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure logging
LOG_DIR = '/app/logs'
os.makedirs(LOG_DIR, exist_ok=True)

formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

# File handler for logging
file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, 'app.log'),
    maxBytes=10485760,  # 10MB
    backupCount=10
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)

# Console handler for logging
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# Set up app logger
app.logger.addHandler(file_handler)
app.logger.addHandler(console_handler)
app.logger.setLevel(logging.INFO)

# Set up werkzeug logger
logging.getLogger('werkzeug').addHandler(file_handler)

# Configuration
NOCODB_URL = os.environ.get("NOCODB_URL", "http://localhost:8080")
NOCODB_TOKEN = os.environ.get("NOCODB_AUTH_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
SPEECHIFY_TOKEN = os.environ.get("SPEECHIFY_TOKEN")
SPEECHIFY_URL = os.environ.get("SPEECHIFY_URL")


# Initialize clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)
s3_client = boto3.client('s3',
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name='us-east-1'  # Dummy region for MinIO
)

def nocodb_api_call(method, endpoint, data=None):
    headers = {
        "xc-auth": NOCODB_TOKEN,
        "Content-Type": "application/json"
    }
    url = f"{NOCODB_URL}/api/v2/{endpoint}"
    response = requests.request(method, url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def get_parser_features(content_type, url):
    """Determine appropriate parser features based on content type and URL"""
    if content_type and 'xml' in content_type.lower():
        return 'xml'
    if url and urlparse(url).netloc == 'increment.com':
        return 'html.parser'  # Increment.com is known to be HTML
    return 'lxml'  # Default to lxml as it handles both HTML and XML well

@app.route('/scrap', methods=['POST'])
def scrape_content():
    url = request.json.get('source')
    if not url:
        app.logger.error("No source URL provided")
        return jsonify({"error": "No source URL provided"}), 400
    
    try:
        app.logger.info(f"Scraping content from: {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '')
        parser_features = get_parser_features(content_type, url)
        app.logger.info(f"Using parser features: {parser_features}")
        
        soup = BeautifulSoup(response.text, parser_features)
        
        # Extract title - try multiple possible locations
        title = None
        title_candidates = [
            soup.find('h1'),
            soup.find('meta', property='og:title'),
            soup.find('title')
        ]
        
        for candidate in title_candidates:
            if candidate:
                if candidate.string:
                    title = candidate.string.strip()
                elif candidate.get('content'):
                    title = candidate.get('content').strip()
                if title:
                    break
        
        if not title:
            app.logger.warning("Could not find title")
            title = "Untitled Content"
        
        # Extract content with code blocks
        content_blocks = []
        article = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
        
        if not article:
            app.logger.warning("Could not find main content container, using body")
            article = soup.body
        
        def process_element(element):
            # Check if element is a code block
            if element.name == 'pre' or element.name == 'code' or 'highlight' in element.get('class', []):
                code_content = element.get_text()
                language = None
                
                # Try to detect language from class
                classes = element.get('class', []) + element.parent.get('class', [])
                for class_name in classes:
                    if 'language-' in class_name:
                        language = class_name.replace('language-', '')
                        break
                    elif 'highlight-' in class_name:
                        language = class_name.replace('highlight-', '')
                        break
                
                return {
                    "type": "code",
                    "content": code_content.strip(),
                    "language": language or "plain"
                }
            
            # Regular text content
            elif element.name == 'p':
                text = element.get_text().strip()
                if text:
                    return {
                        "type": "text",
                        "content": text
                    }
            
            return None

        # Process all elements in the article
        for element in article.find_all(['p', 'pre', 'code', 'div']):
            # Skip elements in nav, footer, etc.
            if any(parent.name in ['nav', 'footer', 'sidebar'] for parent in element.parents):
                continue
                
            # Check for code blocks
            if ('highlight' in element.get('class', []) or 
                'highlighter-rouge' in element.get('class', []) or
                element.name in ['pre', 'code']):
                
                # Avoid duplicate code blocks (sometimes nested)
                if not any('highlight' in parent.get('class', []) for parent in element.parents):
                    result = process_element(element)
                    if result:
                        content_blocks.append(result)
            
            # Regular paragraphs
            elif element.name == 'p':
                result = process_element(element)
                if result:
                    content_blocks.append(result)
        
        if not content_blocks:
            app.logger.error("No content found")
            return jsonify({"error": "No content found on the page"}), 400
        
        app.logger.info(f"Successfully scraped content. Title length: {len(title)}, Content blocks: {len(content_blocks)}")
        
        # Convert content blocks to JSON string
        content_json = json.dumps(content_blocks, ensure_ascii=False, indent=2)
        
        app.logger.info(f"Successfully scraped content. Title length: {len(title)}, Content blocks: {len(content_blocks)}")
        
        return jsonify({
            "title": title,
            "content": content_json  # This is now a JSON string
        })
        
    except requests.RequestException as e:
        app.logger.error(f"Request failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch URL: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"Scraping failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check NocoDB connection
        response = requests.get(f"{NOCODB_URL}/api/v1/health")
        response.raise_for_status()
        
        # Check MinIO connection
        s3_client.list_buckets()
        
        app.logger.info("Health check passed")
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        app.logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

@app.route('/ai', methods=['POST'])
def process_with_ai():
    source = request.args.get('source', 'openai')
    model = request.args.get('model', 'gpt-4')
    content = request.json
    
    if not content or 'title' not in content or 'content' not in content:
        return jsonify({"error": "Invalid content format"}), 400
    
    try:
        # Process with OpenAI
        prompt = f"""
        Title: {content['title']}
        Content: {content['content']}

        Create a video script divided into key scenes that effectively explain this content. When referencing programming languages or tools, use the format 'logo:language_name' and it will be replaced with the appropriate logo URL (https://abrudz.github.io/logos/[Language].svg).

        Provide output in the following JSON format:

        {{
            "scenes": [
                {{
                    "timing": "0-15",
                    "script": "Narration text for this scene",
                    "visual_elements": [
                        {{
                            "type": "image",
                            "prompt": "Detailed image generation prompt focusing on composition, style, and key elements - DO NOT include tool/language logos in the prompt",
                            "overlays": [
                                {{
                                    "type": "logo",
                                    "name": "Python",  # Will be converted to https://abrudz.github.io/logos/Python.svg
                                    "position": {{
                                        "x": "left|center|right",
                                        "y": "top|middle|bottom"
                                    }},
                                    "size": "small|medium|large"
                                }},
                                {{
                                    "type": "text",
                                    "content": "Text to display on screen (optional)",
                                    "style": {{
                                        "position": {{
                                            "x": "left|center|right",
                                            "y": "top|middle|bottom"
                                        }},
                                        "font_size": "large|medium|small",
                                        "emphasis": "bold|normal"
                                    }}
                                }}
                            ]
                        }},
                        {{
                            "type": "code",
                            "language": "python|javascript|etc",
                            "content": "Actual code to display",
                            "highlight_lines": [1, 3],
                            "animation": "typing|fade|static"
                        }}
                    ]
                }}
            ],
            "style_guide": {{
                "visual_theme": "modern|technical|minimal|etc",
                "color_palette": ["primary", "secondary", "accent"],
                "transition_style": "fade|slide|none"
            }}
        }}

        Guidelines:
        1. Keep scenes between 10-15 seconds for good pacing
        2. For code examples:
        - Keep them concise and focused
        - Include only relevant parts
        - Suggest syntax highlighting for key concepts
        3. For images:
        - Describe composition in detail
        - Specify style (photorealistic, 3D render, illustration)
        - Include camera angle and focus points
        - DO NOT include logos in image generation prompts
        4. For logos:
        - Use the "logo" type in overlays
        - Supported logos: Python, Ruby, PHP, Perl, Swift, Java, Julia, R, Matlab, etc.
        - Just use the plain name without -dark suffix
        5. Text overlays:
        - Keep them brief and impactful
        - Only include when necessary for emphasis
        - Consider screen position for readability

        Example scene showing proper logo usage:
        {{
            "timing": "0-10",
            "script": "Rust's memory safety guarantees make it perfect for systems programming",
            "visual_elements": [
                {{
                    "type": "image",
                    "prompt": "A secure vault door with metallic gears and mechanical components, representing system-level programming, dramatic lighting, 3D render style",
                    "overlays": [
                        {{
                            "type": "logo",
                            "name": "Rust",
                            "position": {{
                                "x": "right",
                                "y": "top"
                            }},
                            "size": "large"
                        }},
                        {{
                            "type": "text",
                            "content": "Memory Safety by Design",
                            "style": {{
                                "position": {{
                                    "x": "left",
                                    "y": "bottom"
                                }},
                                "font_size": "large",
                                "emphasis": "bold"
                            }}
                        }}
                    ]
                }}
            ]
        }}

        Remember: 
        - Keep image prompts focused on the scene composition without including logos
        - Use the overlay system for logos and text
        - Logo references should be simple language names (e.g., "Python" not "Python-dark")
        """
        
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        
        processed_content = json.loads(response.choices[0].message.content)
        return jsonify(processed_content)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-image', methods=['POST'])
def generate_image():
    source = request.args.get('source', 'openai')
    model = request.args.get('model', 'dall-e-3')
    prompt = request.json.get('prompt')
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    try:
        # Generate image with DALL-E
        response = openai_client.images.generate(
            model=model,
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        # Download the image
        image_url = response.data[0].url
        image_response = requests.get(image_url)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.png"
        
        # Upload to MinIO
        s3_client.put_object(
            Bucket='assets',
            Key=f"images/{filename}",
            Body=image_response.content,
            ContentType='image/png'
        )
        
        # Create asset record in NocoDB
        asset_data = {
            "name": filename,
            "type": "image",
            "s3_key": f"images/{filename}",
            "content_type": "image/png",
            "file_size": len(image_response.content),
            "metadata": {
                "prompt": prompt,
                "model": model
            }
        }
        
        # asset_response = nocodb_api_call('POST', 'tables/m31ziu6jn3a3qs7/records', asset_data)
        
        return jsonify({
            "asset_id": "asset_response['id']",
            "s3_key": f"images/{filename}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-audio', methods=['POST'])
def generate_audio():
    text_to_speech = request.json.get('text_to_speech')
    body = {
        "ssml": f"<speak>{text_to_speech}</speak>",
        "voice":{
            "name":"snoop",
            "engine":"resemble",
            "language":"en-US"
        },
        "forcedAudioFormat":"mp3"
    }

    try:
        headers = {
            "Authorization": f"Bearer {SPEECHIFY_TOKEN}",
            "Content-Type": "application/json"
        }
        response = requests.post(SPEECHIFY_URL, headers=headers, json=body)
        
        # Ensure the request was successful
        response.raise_for_status()
        
        # Get the binary content from the response
        audio_content = response.content
        
        filename = f"{uuid.uuid4()}.mp3"
        s3_client.put_object(
            Bucket='assets',
            Key=f"audios/{filename}",
            Body=audio_content,  # Use the binary content instead of the Response object
            ContentType='audio/mpeg'
        )
        return jsonify({
            "s3_key": f"audios/{filename}"
        })
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Speechify API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)