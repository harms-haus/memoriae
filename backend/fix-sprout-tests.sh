#!/bin/bash
# Fix followup-sprout tests by replacing vi.spyOn with queue pattern

FILE="src/services/sprouts/followup-sprout.test.ts"

# Create a Python script to do the replacement
python3 << 'PYTHON_SCRIPT'
import re

file_path = "src/services/sprouts/followup-sprout.test.ts"

with open(file_path, 'r') as f:
    content = f.read()

# Pattern 1: Replace getStateAfterEdit pattern
pattern1 = r'// After insert, return state with edit transaction\s+const getStateAfterEdit = async \(\) => \{[\s\S]*?vi\.spyOn\(followupHandler, \'getFollowupState\'\)\.mockImplementationOnce\(getStateAfterEdit\)'

def replace_edit_pattern(match):
    # Extract creation transaction from context
    return '''// Set up queue: first call returns creation only, second call returns creation + edit
      selectCallQueue = [
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
        ],
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
          {
            id: editTransaction.id,
            sprout_id: editTransaction.sprout_id,
            transaction_type: editTransaction.transaction_type,
            transaction_data: editTransaction.transaction_data,
            created_at: editTransaction.created_at,
          },
        ],
      ]
      selectCallIndex = 0'''

# Pattern 2: Replace getStateAfterSnooze pattern  
pattern2 = r'const getStateAfterSnooze = async \(\) => \{[\s\S]*?vi\.spyOn\(followupHandler, \'getFollowupState\'\)\.mockImplementationOnce\(getStateAfterSnooze\)'

def replace_snooze_pattern(match):
    return '''// Set up queue: first call returns creation only, second call returns creation + snooze
      selectCallQueue = [
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
        ],
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
          {
            id: snoozeTransaction.id,
            sprout_id: snoozeTransaction.sprout_id,
            transaction_type: snoozeTransaction.transaction_type,
            transaction_data: snoozeTransaction.transaction_data,
            created_at: snoozeTransaction.created_at,
          },
        ],
      ]
      selectCallIndex = 0'''

# Pattern 3: Replace getStateAfterDismiss pattern
pattern3 = r'const getStateAfterDismiss = async \(\) => \{[\s\S]*?vi\.spyOn\(followupHandler, \'getFollowupState\'\)\.mockImplementationOnce\(getStateAfterDismiss\)'

def replace_dismiss_pattern(match):
    return '''// Set up queue: first call returns creation + dismissal, second call returns same
      selectCallQueue = [
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
          {
            id: dismissalTransaction.id,
            sprout_id: dismissalTransaction.sprout_id,
            transaction_type: dismissalTransaction.transaction_type,
            transaction_data: dismissalTransaction.transaction_data,
            created_at: dismissalTransaction.created_at,
          },
        ],
        [
          {
            id: creationTransaction.id,
            sprout_id: creationTransaction.sprout_id,
            transaction_type: creationTransaction.transaction_type,
            transaction_data: creationTransaction.transaction_data,
            created_at: creationTransaction.created_at,
          },
          {
            id: dismissalTransaction.id,
            sprout_id: dismissalTransaction.sprout_id,
            transaction_type: dismissalTransaction.transaction_type,
            transaction_data: dismissalTransaction.transaction_data,
            created_at: dismissalTransaction.created_at,
          },
        ],
      ]
      selectCallIndex = 0'''

# Pattern 4: Replace mockResolvedValueOnce for getFollowupState
pattern4 = r'vi\.spyOn\(followupHandler, \'getFollowupState\'\)\.mockResolvedValueOnce\(currentState\)'

def replace_mock_resolved(match):
    return '// State already computed, no queue needed'

# Apply replacements
content = re.sub(pattern1, replace_edit_pattern, content)
content = re.sub(pattern2, replace_snooze_pattern, content)  
content = re.sub(pattern3, replace_dismiss_pattern, content)
content = re.sub(pattern4, replace_mock_resolved, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed vi.spyOn patterns in followup-sprout.test.ts")
PYTHON_SCRIPT

echo "Test fix script completed"

