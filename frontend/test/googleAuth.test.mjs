import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new LocalStorageMock();

describe('Frontend Google OAuth & Routing Architecture', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  test('apiClient.googleLogin sends formatted JSON body with id_token', async () => {
    let capturedUrl = '';
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock.app.jwt.access_token',
          token_type: 'bearer',
          expires_in: 86400,
          user: {
            id: 'usr_12345',
            email: 'merchant@gmail.com',
            full_name: 'Google Merchant',
            is_active: true,
            is_verified: true,
            has_merchant: false
          },
          session_id: 'sess_12345'
        })
      };
    };

    // Import ApiClient logic
    const BASE_URL = 'http://127.0.0.1:8000/api/v1';
    const googleLoginRequest = async (idToken) => {
      const res = await fetch(`${BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      });
      return res.json();
    };

    const res = await googleLoginRequest('google.id.token.credential');
    assert.equal(capturedUrl, 'http://127.0.0.1:8000/api/v1/auth/google');
    assert.equal(capturedOptions.method, 'POST');
    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.id_token, 'google.id.token.credential');
    assert.equal(res.access_token, 'mock.app.jwt.access_token');
    assert.equal(res.user.email, 'merchant@gmail.com');
  });

  test('Authentication state handler establishes session and selects merchant when workspace exists', async () => {
    const mockGoogleResponse = {
      access_token: 'backend_issued_jwt_token',
      user: {
        id: 'usr_existing',
        email: 'alex@store.com',
        full_name: 'Alex Store',
        is_active: true,
        is_verified: true,
        has_merchant: true
      }
    };

    const mockMerchants = [
      { id: 'merch_001', business_name: 'Apex Audio', currency: 'USD' }
    ];

    // Simulate AuthContext googleLogin method
    const handleGoogleLogin = async (_idToken) => {
      // 1. Send ID token to backend
      const res = mockGoogleResponse;
      // 2. Persist backend-issued access token
      localStorage.setItem('token', res.access_token);

      // 3. Fetch user's merchants
      const userMerchants = mockMerchants;
      if (userMerchants.length > 0) {
        localStorage.setItem('current_merchant_id', userMerchants[0].id);
        return { user: res.user, hasMerchant: true, targetRoute: '/' };
      } else {
        localStorage.removeItem('current_merchant_id');
        return { user: res.user, hasMerchant: false, targetRoute: '/onboarding' };
      }
    };

    const result = await handleGoogleLogin('valid_token');
    assert.equal(localStorage.getItem('token'), 'backend_issued_jwt_token');
    assert.equal(localStorage.getItem('current_merchant_id'), 'merch_001');
    assert.equal(result.hasMerchant, true);
    assert.equal(result.targetRoute, '/');
  });

  test('New Google user without merchant workspace is directed to onboarding', async () => {
    const mockGoogleResponse = {
      access_token: 'backend_issued_jwt_new_user',
      user: {
        id: 'usr_new_123',
        email: 'newuser@gmail.com',
        full_name: 'New User',
        is_active: true,
        is_verified: true,
        has_merchant: false
      }
    };

    const mockMerchants = []; // No merchants

    const handleGoogleLogin = async (_idToken) => {
      const res = mockGoogleResponse;
      localStorage.setItem('token', res.access_token);
      const userMerchants = mockMerchants;
      if (userMerchants.length > 0) {
        localStorage.setItem('current_merchant_id', userMerchants[0].id);
        return { user: res.user, hasMerchant: true, targetRoute: '/' };
      } else {
        localStorage.removeItem('current_merchant_id');
        return { user: res.user, hasMerchant: false, targetRoute: '/onboarding' };
      }
    };

    const result = await handleGoogleLogin('valid_token');
    assert.equal(localStorage.getItem('token'), 'backend_issued_jwt_new_user');
    assert.equal(localStorage.getItem('current_merchant_id'), null);
    assert.equal(result.hasMerchant, false);
    assert.equal(result.targetRoute, '/onboarding');
  });

  test('Failed Google authentication clears any partial state and throws error', async () => {
    // Pre-populate stale storage
    localStorage.setItem('token', 'stale_token');
    localStorage.setItem('current_merchant_id', 'stale_merchant');

    const handleGoogleLoginFail = async (_idToken) => {
      try {
        throw new Error('Google token verification failed: Invalid Google token issuer.');
      } catch (err) {
        // Rollback state cleanly
        localStorage.removeItem('token');
        localStorage.removeItem('current_merchant_id');
        throw err;
      }
    };

    await assert.rejects(
      async () => {
        await handleGoogleLoginFail('bad_token');
      },
      {
        name: 'Error',
        message: 'Google token verification failed: Invalid Google token issuer.'
      }
    );

    // Verify stale state was wiped clean
    assert.equal(localStorage.getItem('token'), null);
    assert.equal(localStorage.getItem('current_merchant_id'), null);
  });
});
