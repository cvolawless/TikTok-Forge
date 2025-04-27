#!/bin/bash

# Configuration
NOCODB_URL="http://localhost:8080"
AUTH_TOKEN=""
BASE_ID="" # ADD YOUR BASE ID

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local full_url=""
    
    # Check if endpoint already starts with api/v1 or api/v2
    if [[ $endpoint == api/v* ]]; then
        full_url="$NOCODB_URL/$endpoint"
    else
        full_url="$NOCODB_URL/api/v1/$endpoint"
    fi

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            "$full_url" \
            -H "Content-Type: application/json" \
            -H "xc-auth: $AUTH_TOKEN" \
            -d "$data"
    else
        curl -s -X "$method" \
            "$full_url" \
            -H "Content-Type: application/json" \
            -H "xc-auth: $AUTH_TOKEN"
    fi
}

# Function to create a table
create_table() {
    local table_name=$1
    local columns=$2

    echo "Creating table: $table_name"
    api_call "POST" "db/meta/projects/$BASE_ID/tables" "{
        \"table_name\": \"$table_name\",
        \"title\": \"$table_name\",
        \"columns\": $columns
    }"
}

# Wait for NocoDB to be ready
echo "Waiting for NocoDB to be ready..."
while ! curl -s "$NOCODB_URL/api/v1/health" > /dev/null; do
    sleep 2
done


# Create admin user if not exists
echo "Creating admin user..."
SIGNUP_RESPONSE=$(curl -s -X "POST" "$NOCODB_URL/api/v1/auth/user/signup" \
    -H "Content-Type: application/json" \
    -d "{
    \"email\": \"admin@local.dev\",
    \"password\": \"Admin123!\",
    \"roles\": \"org-level-creator\"
 }")


# Login to get auth token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X "POST" "$NOCODB_URL/api/v1/auth/user/signin" \
    -H "Content-Type: application/json" \
    -d "{
    \"email\": \"admin@local.dev\",
    \"password\": \"Admin123!\"
}")

AUTH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Auth token: $AUTH_TOKEN"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Failed to get auth token${NC}"
    exit 1
fi

# Create video_templates table
VIDEO_TEMPLATES_COLUMNS='[
    {"column_name": "id", "title": "id", "uidt": "ID", "pk": true, "ai": false},
    {"column_name": "name", "title": "name", "uidt": "SingleLineText"},
    {"column_name": "description", "title": "description", "uidt": "LongText"},
    {"column_name": "duration", "title": "duration", "uidt": "Number"},
    {"column_name": "resolution_width", "title": "resolution_width", "uidt": "Number", "default": "1080"},
    {"column_name": "resolution_height", "title": "resolution_height", "uidt": "Number", "default": "1920"},
    {"column_name": "components", "title": "components", "uidt": "JSON"},
    {"column_name": "created_at", "title": "created_at", "uidt": "DateTime", "default": "now()"},
    {"column_name": "updated_at", "title": "updated_at", "uidt": "DateTime", "default": "now()"}
]'
create_table "video_templates" "$VIDEO_TEMPLATES_COLUMNS"

# Create content table
CONTENT_COLUMNS='[
    {"column_name": "id", "title": "id", "uidt": "ID", "pk": true, "ai": false},
    {"column_name": "title", "title": "title", "uidt": "SingleLineText"},
    {"column_name": "description", "title": "description", "uidt": "LongText"},
    {"column_name": "template_id", "title": "template_id", "uidt": "LinkToAnotherRecord", "options": {
        "foreignTableName": "video_templates",
        "type": "belongsTo"
    }},
    {"column_name": "content_data", "title": "content_data", "uidt": "JSON"},
    {"column_name": "status", "title": "status", "uidt": "SingleSelect", "dtxp": "draft,processing,completed,failed"},
    {"column_name": "openai_enhanced", "title": "openai_enhanced", "uidt": "Checkbox"},
    {"column_name": "created_at", "title": "created_at", "uidt": "DateTime", "default": "now()"},
    {"column_name": "updated_at", "title": "updated_at", "uidt": "DateTime", "default": "now()"}
]'
create_table "content" "$CONTENT_COLUMNS"

# Create assets table
ASSETS_COLUMNS='[
    {"column_name": "id", "title": "id", "uidt": "ID", "pk": true, "ai": false},
    {"column_name": "name", "title": "name", "uidt": "SingleLineText"},
    {"column_name": "type", "title": "type", "uidt": "SingleSelect", "dtxp": "image,audio,video"},
    {"column_name": "s3_key", "title": "s3_key", "uidt": "SingleLineText"},
    {"column_name": "content_type", "title": "content_type", "uidt": "SingleLineText"},
    {"column_name": "file_size", "title": "file_size", "uidt": "Number"},
    {"column_name": "metadata", "title": "metadata", "uidt": "JSON"},
    {"column_name": "created_at", "title": "created_at", "uidt": "DateTime", "default": "now()"}
]'
create_table "assets" "$ASSETS_COLUMNS"

# Create generated_videos table
GENERATED_VIDEOS_COLUMNS='[
    {"column_name": "id", "title": "id", "uidt": "ID", "pk": true, "ai": false},
    {"column_name": "content_id", "title": "content_id", "uidt": "LinkToAnotherRecord", "options": {
        "foreignTableName": "content",
        "type": "belongsTo"
    }},
    {"column_name": "template_id", "title": "template_id", "uidt": "LinkToAnotherRecord", "options": {
        "foreignTableName": "video_templates",
        "type": "belongsTo"
    }},
    {"column_name": "s3_key", "title": "s3_key", "uidt": "SingleLineText"},
    {"column_name": "duration", "title": "duration", "uidt": "Number"},
    {"column_name": "file_size", "title": "file_size", "uidt": "Number"},
    {"column_name": "status", "title": "status", "uidt": "SingleSelect", "dtxp": "pending,processing,completed,failed"},
    {"column_name": "render_metadata", "title": "render_metadata", "uidt": "JSON"},
    {"column_name": "created_at", "title": "created_at", "uidt": "DateTime", "default": "now()"},
    {"column_name": "completed_at", "title": "completed_at", "uidt": "DateTime"}
]'
create_table "generated_videos" "$GENERATED_VIDEOS_COLUMNS"

# Get table ID for video_templates
TABLES_RESPONSE=$(api_call "GET" "db/meta/projects/$BASE_ID/tables")
TABLE_ID=$(echo "$TABLES_RESPONSE" | grep -o '"id":"[^"]*".*"table_name":"video_templates"' | head -1 | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Video Templates Table ID: $TABLE_ID"

# Insert sample template using v2 API
echo "Inserting sample template..."
api_call "POST" "api/v2/tables/$TABLE_ID/records" "{
    \"id\": 1,
    \"name\": \"Basic TikTok Template\",
    \"description\": \"A simple template with text overlay and background image\",
    \"duration\": 30,
    \"components\": {
        \"layout\": \"vertical\",
        \"scenes\": [
            {
                \"duration\": 30,
                \"components\": [
                    {
                        \"type\": \"background\",
                        \"assetId\": null
                    },
                    {
                        \"type\": \"text\",
                        \"position\": \"center\",
                        \"style\": {
                            \"fontSize\": 48,
                            \"fontWeight\": \"bold\",
                            \"color\": \"#ffffff\"
                        }
                    }
                ]
            }
        ]
    }
}"

# Update .env file with the new token
if [ -f ".env" ]; then
    if grep -q "NOCODB_TOKEN=" .env; then
        # Replace existing token
        sed -i.bak "s/NOCODB_TOKEN=.*/NOCODB_TOKEN=$AUTH_TOKEN/" .env
        rm -f .env.bak
        echo "Updated existing NOCODB_TOKEN in .env file"
    else
        # Add token if it doesn't exist
        echo "NOCODB_TOKEN=$AUTH_TOKEN" >> .env
        echo "Added NOCODB_TOKEN to .env file"
    fi
else
    echo "Warning: .env file not found. Create it and add NOCODB_TOKEN=$AUTH_TOKEN"
fi

echo -e "${GREEN}NocoDB setup completed successfully!${NC}"
