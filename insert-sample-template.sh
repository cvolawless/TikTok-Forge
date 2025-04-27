#!/bin/bash

# Configuration
NOCODB_URL="http://localhost:8080"
# Extract token - handle both quotes and no quotes in .env file
NOCODB_TOKEN=$(grep NOCODB_TOKEN .env | cut -d'=' -f2 | sed 's/^"\(.*\)"$/\1/')
echo "Using token: $NOCODB_TOKEN"
BASE_ID=""  # ADD YOUR BASE ID

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
            -H "xc-auth: $NOCODB_TOKEN" \
            -d "$data" -v
    else
        curl -s -X "$method" \
            "$full_url" \
            -H "Content-Type: application/json" \
            -H "xc-auth: $NOCODB_TOKEN" -v
    fi
}

# Get available tables
echo "Fetching tables in base..."
TABLES_RESPONSE=$(api_call "GET" "db/meta/projects/$BASE_ID/tables")
echo "Tables: $TABLES_RESPONSE"

# Try different endpoint formats for inserting a record
echo "Trying to insert template record..."

# Extract the table_id for video_templates
TABLE_ID=$(echo "$TABLES_RESPONSE" | grep -o '"id":"[^"]*".*"table_name":"video_templates"' | head -1 | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Table ID: $TABLE_ID"

# Use the correct v2 API endpoint format
echo "Trying with v2 API endpoint format..."
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

# Try with v1 data API format
echo "Trying with v1 data API..."
api_call "POST" "db/data/v1/$BASE_ID/video_templates" "{
    \"id\": 2,
    \"name\": \"Basic TikTok Template 2\",
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

echo -e "${GREEN}Sample template insertion attempted!${NC}"