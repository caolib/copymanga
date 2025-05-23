from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.json
    response = requests.post(
        'https://copy20.com/api/kb/web/login',
        data={
            'username': data['username'],
            'password': data['password'],
            'salt': data['salt']
        },
        headers={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Access-Control-Allow-Origin': '*'
        }
    )
    return jsonify(response.json())

@app.route('/proxy/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def proxy(path):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    url = f'https://copy20.com/{path}'
    headers = dict(request.headers)
    headers['Referer'] = 'https://copy20.com/'
    headers.pop('Host', None)
    headers.pop('Origin', None)
    headers.pop('Content-Length', None)

    if request.method == 'GET':
        resp = requests.get(url, params=request.args, headers=headers, cookies=request.cookies)
    elif request.method == 'POST':
        resp = requests.post(url, data=request.form or request.get_json(), headers=headers, cookies=request.cookies)
    elif request.method == 'PUT':
        resp = requests.put(url, data=request.form or request.get_json(), headers=headers, cookies=request.cookies)
    elif request.method == 'DELETE':
        resp = requests.delete(url, headers=headers, cookies=request.cookies)
    else:
        return jsonify({'error': 'Method not allowed'}), 405

    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    response_headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
    return Response(resp.content, resp.status_code, response_headers)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
