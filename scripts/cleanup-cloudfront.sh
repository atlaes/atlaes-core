#!/bin/bash
# Script to check CloudFront distribution status and delete when disabled

DIST_ID="E26SKQNXBRBXKC"
PROFILE="atlaes"

echo "Checking status of CloudFront distribution $DIST_ID..."

STATUS=$(aws cloudfront get-distribution --id $DIST_ID --profile $PROFILE --query "Distribution.Status" --output text)

if [ "$STATUS" == "Deployed" ]; then
    echo "Distribution is still deployed. Waiting for it to be disabled..."
    echo "Run this script again in a few minutes."
elif [ "$STATUS" == "InProgress" ]; then
    echo "Distribution is still being disabled. Please wait..."
    echo "Check again with: aws cloudfront get-distribution --id $DIST_ID --profile $PROFILE --query 'Distribution.Status'"
else
    echo "Distribution status: $STATUS"
    echo "Attempting to delete..."
    
    ETAG=$(aws cloudfront get-distribution-config --id $DIST_ID --profile $PROFILE --query "ETag" --output text)
    aws cloudfront delete-distribution --id $DIST_ID --if-match $ETAG --profile $PROFILE
    
    if [ $? -eq 0 ]; then
        echo "Successfully deleted distribution $DIST_ID"
    else
        echo "Failed to delete. Distribution may still be disabling. Try again later."
    fi
fi

