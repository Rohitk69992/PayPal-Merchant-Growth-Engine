import urllib.request
import json

log_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/auth/login',
    data=json.dumps({'email': 'merchant@paypal-hackathon.demo', 'password': 'PayPalAI2026!'}).encode(),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(log_req) as res:
    log = json.loads(res.read())

token = log['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

m_req = urllib.request.Request('http://127.0.0.1:8000/api/v1/merchants/my-merchants', headers=headers)
with urllib.request.urlopen(m_req) as res:
    merchants = json.loads(res.read())

headers['X-Merchant-ID'] = merchants[0]['id']

p_req = urllib.request.Request('http://127.0.0.1:8000/api/v1/products', headers=headers)
with urllib.request.urlopen(p_req) as res:
    prods = json.loads(res.read())

buyers = [
    ('Elena Rostova', 'elena.rostova@example.com', 149.99),
    ('Marcus Aurelius', 'marcus.a@rome.io', 299.98),
    ('Sophia Chen', 'sophia.c@techventure.com', 99.99),
    ('David Kim', 'david.k@koreasound.kr', 449.97),
]

for name, mail, amt in buyers:
    sim_data = {
        'amount': amt,
        'description': 'Order capture',
        'customer_email': mail,
        'customer_name': name,
        'product_id': prods[0]['id']
    }
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/paypal/simulate-sandbox-payment',
        data=json.dumps(sim_data).encode(),
        headers=headers
    )
    with urllib.request.urlopen(req) as res:
        print('Captured payment for:', name, res.getcode())

# Check overview
o_req = urllib.request.Request('http://127.0.0.1:8000/api/v1/analytics/overview', headers=headers)
with urllib.request.urlopen(o_req) as res:
    overview = json.loads(res.read())
    print('Overview:', overview)

print('Seeding completed successfully!')
