from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/analytics.edit']
KEY_FILE = r'D:\BNB fast\rl-tours-mail-f291970b3668.json'
PROPERTY_ID = '424270961'

credentials = service_account.Credentials.from_service_account_file(
    KEY_FILE, scopes=SCOPES)
admin = build('analyticsadmin', 'v1alpha', credentials=credentials)

body = {
    "user": "bnb-738@rl-tours-mail.iam.gserviceaccount.com",
    "roles": ["predefinedRoles/viewer"]
}
result = admin.properties().accessBindings().create(
    parent=f'properties/{PROPERTY_ID}',
    body=body
).execute()

print("Service account added:", result)
