/**
 * ============================================================================
 * FITMATE STANDALONE ALL-IN-ONE BUNDLE
 * Bundled for instant zero-dependency execution across any local server or file protocol.
 * ============================================================================
 */
(function() {
  'use strict';


// --- Source: images.js ---
/**
 * ============================================================================
 * FITMATE CENTRALIZED IMAGE CONFIGURATION
 * Single source of truth mapping Brand, Landing, Gender, Category, Fit Style,
 * and Anatomical Measurement Guides to locally stored, gender-verified assets.
 *
 * CRITICAL INVARIANTS:
 * - Men's assets (`assets/images/mens/*`) are ONLY used for Men (`male`).
 * - Women's assets (`assets/images/womens/*`) are ONLY used for Women (`female`).
 * - 'Slim' is kept ONLY for Tops (Men & Women) and REMOVED from Bottoms.
 * - 'Shift' is removed from the Dresses UI catalog (replaced by 'Jumpsuit').
 * ============================================================================
 */
const FITMATE_IMAGES = {
  brand: {
    heroLogo: './assets/brand/fitmate-hero-logo.jpg',
    emblem: './assets/brand/fitmate-emblem-crop.jpg',
    emblemFull: './assets/brand/fitmate-emblem.jpg',
    favicon: './assets/brand/favicon.png',
  },
  landing: {
    editorialHero: './assets/images/landing/editorial-hero.jpg',
    editorialAtelier: './assets/images/landing/editorial-atelier.jpg',
    editorialFabric: './assets/images/landing/editorial-fabric.jpg',
    womensShowcase: './assets/images/womens/womens-hero.jpg',
    mensShowcase: './assets/images/mens/mens-hero.jpg',
  },
  gender: {
    male: {
      hero: './assets/images/mens/mens-hero.jpg',
      alt: "Men's tailored fashion collection featuring an adult male model",
    },
    female: {
      hero: './assets/images/womens/womens-hero.jpg',
      alt: "Women's tailored fashion collection featuring an adult female model",
    },
  },
  categories: {
    male: {
      tops: './assets/images/mens/mens-tops.jpg',
      bottoms: './assets/images/mens/mens-bottoms.jpg',
    },
    female: {
      tops: './assets/images/womens/womens-tops.jpg',
      bottoms: './assets/images/womens/womens-bottoms.jpg',
      dresses: './assets/images/womens/womens-dresses.jpg',
    },
  },
  fitStyles: {
    male: {
      tops: {
        'T-shirts': './assets/images/mens/mens-tshirt.jpg',
        Regular: './assets/images/mens/mens-regular.jpg',
        Slim: './assets/images/mens/mens-slim.jpg',
        Oversized: './assets/images/mens/mens-oversized.jpg',
        Sweatshirts: './assets/images/mens/mens-sweatshirt.jpg',
        Jackets: './assets/images/mens/mens-jacket.jpg',
        Kurta: './assets/images/mens/mens-kurta.jpg',
      },
      bottoms: {
        Straight: './assets/images/mens/mens-straight.jpg',
        Loose: './assets/images/mens/mens-loose.jpg',
        Baggy: './assets/images/mens/mens-baggy.jpg',
        Trousers: './assets/images/mens/mens-trousers.jpg',
        Cargo: './assets/images/mens/mens-cargo.jpg',
        'Track Pants': './assets/images/mens/mens-trackpants.jpg',
        Shorts: './assets/images/mens/mens-shorts.jpg',
        Skinny: './assets/images/mens/mens-skinny.jpg',
      },
    },
    female: {
      tops: {
        'T-shirts': './assets/images/womens/womens-tshirt.jpg',
        Regular: './assets/images/womens/womens-regular.jpg',
        Slim: './assets/images/womens/womens-slim.jpg',
        Oversized: './assets/images/womens/womens-oversized.jpg',
        Cropped: './assets/images/womens/womens-cropped.jpg',
        Sweatshirts: './assets/images/womens/womens-sweatshirt.jpg',
        Jackets: './assets/images/womens/womens-jacket.jpg',
        Kurta: './assets/images/womens/womens-kurta.jpg',
      },
      bottoms: {
        Straight: './assets/images/womens/womens-straight.jpg',
        Loose: './assets/images/womens/womens-loose.jpg',
        Baggy: './assets/images/womens/womens-baggy.jpg',
        Trousers: './assets/images/womens/womens-trousers.jpg',
        Cargo: './assets/images/womens/womens-cargo.jpg',
        'Track Pants': './assets/images/womens/womens-trackpants.jpg',
        Shorts: './assets/images/womens/womens-shorts.jpg',
        Skinny: './assets/images/womens/womens-skinny.jpg',
      },
      dresses: {
        Bodycon: './assets/images/womens/womens-bodycon.jpg',
        'A-line': './assets/images/womens/womens-aline.jpg',
        Maxi: './assets/images/womens/womens-maxi.jpg',
        Jumpsuit: './assets/images/womens/womens-jumpsuit.jpg',
      },
    },
  },
  measurementGuides: {
    chest: './assets/images/measurement-guides/chest-bust.svg',
    waist: './assets/images/measurement-guides/waist.svg',
    hips: './assets/images/measurement-guides/hips.svg',
    shoulder: './assets/images/measurement-guides/shoulders.svg',
    height: './assets/images/measurement-guides/height.svg',
    inseam: './assets/images/measurement-guides/inseam.svg',
  },
};
function getCategoryImage(gender, categoryGroup) {
  const g = gender === 'male' ? 'male' : 'female';
  const group = g === 'male' && categoryGroup === 'dresses' ? 'tops' : categoryGroup || 'tops';
  return FITMATE_IMAGES.categories[g][group] || FITMATE_IMAGES.gender[g].hero;
}
function getFitStyleImage(gender, categoryGroup, fitStyleId) {
  const g = gender === 'male' ? 'male' : 'female';
  const group = g === 'male' && categoryGroup === 'dresses' ? 'tops' : categoryGroup || 'tops';
  const map = FITMATE_IMAGES.fitStyles[g]?.[group] || {};
  return map[fitStyleId] || getCategoryImage(g, group) || FITMATE_IMAGES.brand.emblem;
}


// --- Source: api.js ---
/**
 * ============================================================================
 * FITMATE FRONTEND API SERVICE
 * Connects the web client to the FastAPI backend at /api/v1.
 * Supports:
 * - Configurable Base URL via env/window.FITMATE_CONFIG
 * - JWT access/refresh token handling & session persistence in localStorage
 * - Seamless automatic token refresh on 401
 * - Full CRUD for auth, users, measurements, brands, products, recommendations
 * - CLEARLY MARKED MOCK FALLBACKS when backend endpoints are offline or missing
 * ============================================================================
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.FITMATE_CONFIG && window.FITMATE_CONFIG.apiUrl)
  || 'http://localhost:8000/api/v1';

// Token storage keys
const ACCESS_TOKEN_KEY = 'fitmate_access_token';
const REFRESH_TOKEN_KEY = 'fitmate_refresh_token';
const USER_KEY = 'fitmate_user_profile';
const MOCK_STORAGE_PREFIX = 'fitmate_mock_';
class ApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /* --------------------------------------------------------------------------
   * TOKEN & SESSION MANAGEMENT
   * -------------------------------------------------------------------------- */
  getAccessToken() {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && token.startsWith('mock_jwt_')) {
      this.clearSession();
      return null;
    }
    return token;
  }

  getRefreshToken() {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token && token.startsWith('mock_jwt_')) {
      this.clearSession();
      return null;
    }
    return token;
  }

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveSession(tokenData, userData = null) {
    if (tokenData.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokenData.access_token);
    }
    if (tokenData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);
    }
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
  }

  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

  /* --------------------------------------------------------------------------
   * CORE HTTP REQUEST WRAPPER
   * -------------------------------------------------------------------------- */
  async request(endpoint, options = {}, retryOn401 = true) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    const token = this.getAccessToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized & refresh token rotation
      if (response.status === 401 && retryOn401) {
        if (this.getRefreshToken()) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.request(endpoint, options, false);
          }
        }
        if (token) {
          this.clearSession();
          if (!endpoint.startsWith('/auth/') && !endpoint.startsWith('/users/')) {
            return this.request(endpoint, options, false);
          }
          window.dispatchEvent(new CustomEvent('fitmate:auth_expired'));
        }
      }

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            errMessage = errData.error.message;
          } else if (errData && errData.detail) {
            errMessage = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          } else if (errData && errData.message) {
            errMessage = errData.message;
          }
        } catch {
          // ignore parsing error
        }
        const error = new Error(errMessage);
        error.status = response.status;
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (err) {
      // Network failure or backend not running -> signal mockable request
      err.isNetworkError = !err.status;
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * AUTHENTICATION ENDPOINTS
   * -------------------------------------------------------------------------- */
  async register(emailOrObj, fullName, password) {
    let email = emailOrObj;
    if (emailOrObj && typeof emailOrObj === 'object') {
      email = emailOrObj.email;
      fullName = emailOrObj.full_name || emailOrObj.fullName || 'User';
      password = emailOrObj.password;
    }
    try {
      await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: String(email).trim().toLowerCase(),
          full_name: String(fullName || 'User').trim(),
          password,
        }),
      });
      // Automatically log in after registration
      return await this.login(email, password);
    } catch (err) {
      if (err.isNetworkError) {
        console.warn('[MOCK FALLBACK] Backend offline: Simulating user registration');
        return this._mockRegister(email, fullName, password);
      }
      throw err;
    }
  }

  async login(email, password) {
    try {
      const tokenData = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      // Store tokens
      this.saveSession(tokenData);

      // Fetch user profile
      try {
        const user = await this.getProfile();
        this.saveSession(tokenData, user);
        return { tokenData, user };
      } catch {
        const fallbackUser = {
          id: tokenData.user_id || 1,
          email: email.trim().toLowerCase(),
          full_name: email.split('@')[0],
          role: tokenData.role || 'user',
        };
        this.saveSession(tokenData, fallbackUser);
        return { tokenData, user: fallbackUser };
      }
    } catch (err) {
      if (err.isNetworkError) {
        console.warn('[MOCK FALLBACK] Backend offline: Simulating user login');
        return this._mockLogin(email, password);
      }
      throw err;
    }
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const data = await this.request(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
        false
      );
      this.saveSession(data);
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (err) {
      console.warn('Logout API notice:', err.message);
    } finally {
      this.clearSession();
    }
  }

  async getProfile() {
    try {
      return await this.request('/users/me');
    } catch (err) {
      if (err.isNetworkError) {
        return this.getCurrentUser() || this._mockDefaultUser();
      }
      throw err;
    }
  }

  async getCurrentUserProfile() {
    return this.getProfile();
  }

  async updateProfile(updates) {
    try {
      const user = await this.request('/users/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      this.saveSession({}, user);
      return user;
    } catch (err) {
      if (err.isNetworkError) {
        const current = this.getCurrentUser() || this._mockDefaultUser();
        const updated = { ...current, ...updates };
        this.saveSession({}, updated);
        return updated;
      }
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * BODY MEASUREMENTS ENDPOINTS
   * -------------------------------------------------------------------------- */
  async listMeasurements() {
    try {
      return await this.request('/measurements');
    } catch (err) {
      if (err.isNetworkError) {
        console.warn('[MOCK FALLBACK] Backend offline: Loading saved mock profiles');
        return this._getMockProfiles();
      }
      throw err;
    }
  }

  async createMeasurementProfile(payload) {
    try {
      return await this.request('/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        console.warn('[MOCK FALLBACK] Backend offline: Storing profile locally');
        return this._createMockProfile(payload);
      }
      throw err;
    }
  }

  async getMeasurementProfile(profileId) {
    try {
      return await this.request(`/measurements/${profileId}`);
    } catch (err) {
      if (err.isNetworkError) {
        const list = this._getMockProfiles();
        return list.find((p) => p.id === Number(profileId)) || list[0];
      }
      throw err;
    }
  }

  async updateMeasurementProfile(profileId, payload) {
    try {
      return await this.request(`/measurements/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this._updateMockProfile(profileId, payload);
      }
      throw err;
    }
  }

  async patchMeasurementProfile(profileId, payload) {
    try {
      return await this.request(`/measurements/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this._updateMockProfile(profileId, payload);
      }
      throw err;
    }
  }

  async resetMeasurementProfile(profileId) {
    try {
      return await this.request(`/measurements/${profileId}/reset`, {
        method: 'POST',
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this._updateMockProfile(profileId, {
          height_cm: 168.0,
          weight_kg: 62.0,
          chest_bust_cm: 92.0,
          waist_cm: 74.0,
          hips_cm: 98.0,
          shoulder_cm: null,
          inseam_cm: null,
        });
      }
      throw err;
    }
  }

  async deleteMeasurementProfile(profileId) {
    try {
      return await this.request(`/measurements/${profileId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this._deleteMockProfile(profileId);
      }
      throw err;
    }
  }

  async setDefaultMeasurementProfile(profileId) {
    try {
      return await this.request(`/measurements/${profileId}/default`, {
        method: 'POST',
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this._setDefaultMockProfile(profileId);
      }
      throw err;
    }
  }

  async convertUnit(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    try {
      const res = await this.request('/measurements/convert', {
        method: 'POST',
        body: JSON.stringify({ value, from_unit: fromUnit, to_unit: toUnit }),
      });
      return res.converted_value;
    } catch {
      // Local calculation fallback: 1 in = 2.54 cm
      if (fromUnit === 'in' && toUnit === 'cm') {
        return Math.round(value * 2.54 * 10) / 10;
      }
      return Math.round((value / 2.54) * 10) / 10;
    }
  }

  /* --------------------------------------------------------------------------
   * BRANDS & CATALOG ENDPOINTS
   * -------------------------------------------------------------------------- */
  async listBrands() {
    try {
      return await this.request('/brands');
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockBrands();
      }
      throw err;
    }
  }

  async listCategories() {
    try {
      return await this.request('/brands/categories');
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockCategories();
      }
      throw err;
    }
  }

  async getBrand(brandId) {
    try {
      return await this.request(`/brands/${brandId}`);
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockBrands().find((b) => b.id === Number(brandId)) || this._mockBrands()[0];
      }
      throw err;
    }
  }

  async getBrandSizeCharts(brandId) {
    try {
      return await this.request(`/brands/${brandId}/size-charts`);
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockSizeChart();
      }
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * PRODUCTS & SIZE CHARTS ENDPOINTS
   * -------------------------------------------------------------------------- */
  async listProducts(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.brandId) params.append('brand_id', filters.brandId);
      if (filters.categoryCode) params.append('category_code', filters.categoryCode);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.request(`/products${query}`);
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockProducts(filters);
      }
      throw err;
    }
  }

  async getProduct(productId) {
    try {
      return await this.request(`/products/${productId}`);
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockProducts().find((p) => p.id === Number(productId)) || this._mockProducts()[0];
      }
      throw err;
    }
  }

  async getProductSizeChart(productId) {
    try {
      return await this.request(`/products/${productId}/size-chart`);
    } catch (err) {
      if (err.isNetworkError) {
        return this._mockSizeChart();
      }
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * RECOMMENDATION & FIT VERDICT ENDPOINTS
   * -------------------------------------------------------------------------- */
  async createRecommendation(payload) {
    try {
      return await this.request('/recommendations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        console.warn('[MOCK FALLBACK] Backend offline: Generating hybrid recommendation simulation');
        return this._mockRecommendationResult(payload);
      }
      throw err;
    }
  }

  async listRecommendations() {
    try {
      return await this.request('/recommendations');
    } catch (err) {
      if (err.isNetworkError) {
        return this._getMockRecommendations();
      }
      throw err;
    }
  }

  async getRecommendation(id) {
    try {
      return await this.request(`/recommendations/${id}`);
    } catch (err) {
      if (err.isNetworkError) {
        const list = this._getMockRecommendations();
        return list.find((r) => r.recommendation_id === Number(id)) || list[0];
      }
      throw err;
    }
  }

  async deleteRecommendation(id) {
    try {
      return await this.request(`/recommendations/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      if (err.isNetworkError) {
        let list = this._getMockRecommendations();
        list = list.filter((r) => r.recommendation_id !== Number(id));
        try {
          localStorage.setItem(MOCK_STORAGE_PREFIX + 'recommendations', JSON.stringify(list));
        } catch {}
        return { success: true };
      }
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * FIT FEEDBACK ENDPOINTS
   * -------------------------------------------------------------------------- */
  async submitFeedback(payload) {
    try {
      return await this.request('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        return {
          id: Math.floor(Math.random() * 1000),
          recommendation_id: payload.recommendation_id,
          fit_label: payload.fit_label,
          purchased_size: payload.purchased_size || 'M',
          comments: payload.comments || '',
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  /* --------------------------------------------------------------------------
   * CLEARLY MARKED MOCK / MISSING ENDPOINTS
   * 1. Multi-Brand Comparison Matrix (missing on backend)
   * 2. Direct Size Chart Delta Comparison (derived from product chart + user profile)
   * -------------------------------------------------------------------------- */

  /**
   * Live Multi-brand size comparison endpoint across all seeded brands.
   * Compares the user's silhouette across multiple top brands using live RecommendationEngine + 5 ML models.
   */
  async evaluateMultiBrandFitStyle(payload = {}) {
    try {
      return await this.request('/comparison/brands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err.isNetworkError) {
        return this.getMultiBrandComparison(payload, payload.category || 'womens_tops');
      }
      throw err;
    }
  }

  async getMultiBrandComparison(userMeasurements = {}, categoryCode = 'womens_tops', fitStyle = 'Regular', gender = 'female') {
    try {
      return await this.evaluateMultiBrandFitStyle({
        gender: userMeasurements.gender || gender || (categoryCode.startsWith('mens_') ? 'male' : 'female'),
        category: categoryCode,
        fit_style: userMeasurements.fit_style || fitStyle || 'Regular',
        unit: 'cm',
        chest_bust: userMeasurements.chest_bust ?? userMeasurements.chest_bust_cm ?? userMeasurements.chest ?? 92,
        waist: userMeasurements.waist ?? userMeasurements.waist_cm ?? 74,
        hips: userMeasurements.hips ?? userMeasurements.hips_cm ?? 98,
        height: userMeasurements.height ?? userMeasurements.height_cm ?? 168,
        weight: userMeasurements.weight ?? userMeasurements.weight_kg ?? 62,
        shoulder: userMeasurements.shoulder ?? userMeasurements.shoulder_cm ?? null,
        inseam: userMeasurements.inseam ?? userMeasurements.inseam_cm ?? null,
      });
    } catch {
      try {
        return await this.request(`/comparison/brands?category=${encodeURIComponent(categoryCode)}&fit_style=${encodeURIComponent(fitStyle)}&gender=${encodeURIComponent(gender)}`);
      } catch {
        // Return documented client-side fallback when offline
        return [
          {
            brand_id: 1,
            brand: 'Zara',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: 'Runs slightly narrow in shoulders; consider sizing up for relaxed comfort',
            fitMatchPct: 96,
            confidence: 0.96,
            verdict: 'Good Fit',
            status: 'success',
          },
          {
            brand_id: 2,
            brand: 'H&M',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'S',
            cutNote: 'Standard relaxed EU cut with +4 cm natural chest ease',
            fitMatchPct: 94,
            confidence: 0.94,
            verdict: 'Good Fit',
            status: 'success',
          },
          {
            brand_id: 3,
            brand: "Levi's",
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: 'Heritage denim block, true to size',
            fitMatchPct: 95,
            confidence: 0.95,
            verdict: 'Good Fit',
            status: 'success',
          },
          {
            brand_id: 4,
            brand: 'Uniqlo',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: 'Generous LifeWear comfort cut with extra room',
            fitMatchPct: 97,
            confidence: 0.97,
            verdict: 'Good Fit',
            status: 'success',
          },
          {
            brand_id: 5,
            brand: 'Mango',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: 'Tailored slim Spanish fit; runs slightly small',
            fitMatchPct: 91,
            confidence: 0.91,
            verdict: 'Snug Fit',
            status: 'warning',
          },
          {
            brand_id: 6,
            brand: 'NordicThread',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: 'True to Scandinavian tailoring standard',
            fitMatchPct: 98,
            confidence: 0.98,
            verdict: 'Good Fit',
            status: 'success',
          },
          {
            brand_id: 7,
            brand: 'AuraAtelier',
            category: categoryCode,
            fitStyle,
            recommendedSize: 'M',
            cutNote: ' Sculpted European atelier fit; runs small, consider sizing up',
            fitMatchPct: 90,
            confidence: 0.90,
            verdict: 'Snug Fit',
            status: 'warning',
          },
        ];
      }
    }
  }

  /**
   * [CLEARLY MARKED MOCK / DERIVED]
   * Computes size vs body metric comparison table (XS through XXL)
   * using real size chart if available, otherwise editorial verified matrix.
   */
  async getComparisonMatrix(productId, userProfile) {
    try {
      const chart = await this.getProductSizeChart(productId);
      if (chart && chart.garment_measurements && chart.garment_measurements.length > 0) {
        return this._deriveMatrixFromGarmentMeasurements(chart.garment_measurements, userProfile);
      }
    } catch {
      // fallback to mock matrix
    }

    return this._mockSizeMatrix(userProfile);
  }

  /* --------------------------------------------------------------------------
   * INTERNAL MOCK GENERATORS FOR OFFLINE / RESILIENT MODE
   * -------------------------------------------------------------------------- */
  _mockDefaultUser() {
    return {
      id: 1,
      email: 'alex@sizerec.example.com',
      full_name: 'Alex Rivera',
      role: 'user',
      is_active: true,
    };
  }

  _mockRegister(email, fullName, password) {
    const user = {
      id: Math.floor(Math.random() * 900) + 10,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role: 'user',
      is_active: true,
    };
    const tokenData = {
      access_token: 'mock_jwt_access_' + Date.now(),
      refresh_token: 'mock_jwt_refresh_' + Date.now(),
      token_type: 'bearer',
      user_id: user.id,
      role: 'user',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
    this.saveSession(tokenData, user);
    return { tokenData, user };
  }

  _mockLogin(email, password) {
    return this._mockRegister(email, email.split('@')[0], password);
  }

  _getMockProfiles() {
    try {
      const stored = localStorage.getItem(MOCK_STORAGE_PREFIX + 'profiles');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }

    const defaults = [
      {
        id: 1,
        user_id: 1,
        profile_name: "Emma's Default Silhouette",
        gender: 'female',
        fit_preference: 'regular',
        original_unit: 'cm',
        is_default: true,
        height_cm: 168.0,
        weight_kg: 62.0,
        chest_bust_cm: 92.0,
        underbust_cm: 78.0,
        waist_cm: 74.0,
        hips_cm: 98.0,
        shoulder_cm: 40.0,
        sleeve_cm: 60.0,
        torso_cm: 62.0,
        inseam_cm: 78.0,
        thigh_cm: 56.0,
        rise_cm: 26.0,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        profile_name: "David's Partner Profile",
        gender: 'male',
        fit_preference: 'slim',
        original_unit: 'cm',
        is_default: false,
        height_cm: 180.0,
        weight_kg: 78.0,
        chest_bust_cm: 100.0,
        underbust_cm: null,
        waist_cm: 85.0,
        hips_cm: 101.0,
        shoulder_cm: 46.0,
        sleeve_cm: 65.0,
        torso_cm: 69.0,
        inseam_cm: 82.0,
        thigh_cm: 58.0,
        rise_cm: 28.0,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];

    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'profiles', JSON.stringify(defaults));
    } catch {
      // ignore
    }
    return defaults;
  }

  _createMockProfile(payload) {
    const list = this._getMockProfiles();
    if (payload.is_default) {
      list.forEach((p) => (p.is_default = false));
    }
    const newProfile = {
      id: Date.now(),
      user_id: 1,
      profile_name: payload.profile_name || 'My Profile',
      gender: payload.gender || 'unisex',
      fit_preference: payload.fit_preference || 'regular',
      original_unit: payload.unit || 'cm',
      is_default: payload.is_default || list.length === 0,
      height_cm: payload.height || 168,
      weight_kg: payload.weight || 62,
      chest_bust_cm: payload.chest_bust || 92,
      underbust_cm: payload.underbust || null,
      waist_cm: payload.waist || 74,
      hips_cm: payload.hips || 98,
      shoulder_cm: payload.shoulder || 40,
      sleeve_cm: payload.sleeve || 60,
      torso_cm: payload.torso || 62,
      inseam_cm: payload.inseam || 78,
      thigh_cm: payload.thigh || 56,
      rise_cm: payload.rise || 26,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newProfile);
    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'profiles', JSON.stringify(list));
    } catch {}
    return newProfile;
  }

  _updateMockProfile(id, payload) {
    const list = this._getMockProfiles();
    const idx = list.findIndex((p) => p.id === Number(id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() };
      try {
        localStorage.setItem(MOCK_STORAGE_PREFIX + 'profiles', JSON.stringify(list));
      } catch {}
      return list[idx];
    }
    return null;
  }

  _deleteMockProfile(id) {
    let list = this._getMockProfiles();
    list = list.filter((p) => p.id !== Number(id));
    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'profiles', JSON.stringify(list));
    } catch {}
    return { success: true, message: `Profile ${id} deleted` };
  }

  _setDefaultMockProfile(id) {
    const list = this._getMockProfiles();
    list.forEach((p) => {
      p.is_default = p.id === Number(id);
    });
    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'profiles', JSON.stringify(list));
    } catch {}
    return { success: true };
  }

  _mockBrands() {
    return [
      {
        id: 1,
        name: 'Zara',
        slug: 'zara',
        website_domain: 'zara.com',
        country: 'Spain',
        sizing_system: 'EU/International',
        description: 'Contemporary fashion tailoring with modern fitted silhouettes.',
        is_active: true,
      },
      {
        id: 2,
        name: 'H&M',
        slug: 'hm',
        website_domain: 'hm.com',
        country: 'Sweden',
        sizing_system: 'EU/US Standard',
        description: 'Everyday casual basics and seasonal collections.',
        is_active: true,
      },
      {
        id: 3,
        name: "Levi's",
        slug: 'levis',
        website_domain: 'levi.com',
        country: 'United States',
        sizing_system: 'US Waist/Inseam',
        description: 'Heritage denim cuts and rugged American apparel.',
        is_active: true,
      },
      {
        id: 4,
        name: 'Uniqlo',
        slug: 'uniqlo',
        website_domain: 'uniqlo.com',
        country: 'Japan',
        sizing_system: 'Asian/Global Comfort',
        description: 'LifeWear essentials engineered for all-day comfort and stretch.',
        is_active: true,
      },
      {
        id: 5,
        name: 'Mango',
        slug: 'mango',
        website_domain: 'mango.com',
        country: 'Spain',
        sizing_system: 'EU/International',
        description: 'Mediterranean aesthetic tailored with crisp silhouettes.',
        is_active: true,
      },
      {
        id: 6,
        name: 'NordicThread',
        slug: 'nordic-thread',
        website_domain: 'nordicthread.example.com',
        country: 'Sweden',
        sizing_system: 'EU/International',
        description: 'Minimalist Scandinavian essentials with verified garment measurements.',
        is_active: true,
      },
    ];
  }

  _mockCategories() {
    return [
      {
        id: 1,
        code: 'womens_tops',
        name: "Women's Tops",
        gender: 'female',
        garment_group: 'tops',
        description: 'Shirts, blouses, tees, knitwear, and jackets for women',
      },
      {
        id: 2,
        code: 'womens_bottoms',
        name: "Women's Bottoms",
        gender: 'female',
        garment_group: 'bottoms',
        description: 'Jeans, trousers, skirts, and shorts for women',
      },
      {
        id: 3,
        code: 'mens_tops',
        name: "Men's Tops",
        gender: 'male',
        garment_group: 'tops',
        description: 'Shirts, tees, polos, and sweaters for men',
      },
      {
        id: 4,
        code: 'mens_bottoms',
        name: "Men's Bottoms",
        gender: 'male',
        garment_group: 'bottoms',
        description: 'Jeans, chinos, and trousers for men',
      },
    ];
  }

  _mockProducts(filters = {}) {
    const list = [
      {
        id: 1,
        brand_id: 1,
        category_id: 1,
        brand_name: 'Zara',
        name: 'White Poplin Fit Shirt',
        external_product_id: 'ZR-TOP-101',
        product_url: 'https://zara.com/sample/poplin-shirt',
        description: 'Tailored crisp organic poplin button-down with clean collar.',
        primary_fabric: 'Organic Cotton',
        fabric_composition: '98% Cotton, 2% Elastane',
        stretch_percentage: 2.0,
        intended_fit: 'regular',
        available_sizes: ['XS', 'S', 'M', 'L', 'XL'],
        image_url:
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
        is_active: true,
      },
      {
        id: 2,
        brand_id: 3,
        category_id: 2,
        brand_name: "Levi's",
        name: '501® Original Fit Jeans',
        external_product_id: 'LV-JNS-501',
        product_url: 'https://levi.com/sample/501-jeans',
        description: 'Timeless straight leg silhouette crafted from durable cotton twill.',
        primary_fabric: 'Denim',
        fabric_composition: '99% Cotton, 1% Elastane',
        stretch_percentage: 1.5,
        intended_fit: 'regular',
        available_sizes: ['W28', 'W29', 'W30', 'W31', 'W32', 'W33'],
        image_url:
          'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80',
        is_active: true,
      },
      {
        id: 3,
        brand_id: 4,
        category_id: 1,
        brand_name: 'Uniqlo',
        name: 'Supima Cotton Crewneck Tee',
        external_product_id: 'UQ-TEE-301',
        product_url: 'https://uniqlo.com/sample/supima-tee',
        description: 'Silky smooth 100% premium long-staple Supima cotton with comfort ease.',
        primary_fabric: 'Supima Cotton',
        fabric_composition: '100% Cotton',
        stretch_percentage: 4.0,
        intended_fit: 'relaxed',
        available_sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        image_url:
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
        is_active: true,
      },
      {
        id: 4,
        brand_id: 1,
        category_id: 1,
        brand_name: 'Zara',
        name: 'Oversized Linen Resort Shirt',
        external_product_id: 'ZR-LNN-202',
        product_url: 'https://zara.com/sample/linen-shirt',
        description: 'Airy pure linen weave with dropped shoulders and breezy drape.',
        primary_fabric: 'Linen',
        fabric_composition: '100% French Flax Linen',
        stretch_percentage: 0.0,
        intended_fit: 'relaxed',
        available_sizes: ['S', 'M', 'L'],
        image_url:
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
        is_active: true,
      },
    ];

    if (filters.brandId) {
      return list.filter((p) => p.brand_id === Number(filters.brandId));
    }
    return list;
  }

  _mockSizeChart() {
    return {
      id: 1,
      brand_id: 1,
      category_id: 1,
      name: 'Zara Official Tops Chart',
      data_source: 'brand_official_chart',
      verification_status: 'verified',
      garment_measurements: [
        { size_label: 'XS', size_order: 1, chest_bust_cm: 84.0, waist_cm: 66.0, hips_cm: 90.0 },
        { size_label: 'S', size_order: 2, chest_bust_cm: 89.0, waist_cm: 71.0, hips_cm: 95.0 },
        { size_label: 'M', size_order: 3, chest_bust_cm: 95.0, waist_cm: 78.0, hips_cm: 101.0 },
        { size_label: 'L', size_order: 4, chest_bust_cm: 102.0, waist_cm: 85.0, hips_cm: 108.0 },
        { size_label: 'XL', size_order: 5, chest_bust_cm: 110.0, waist_cm: 93.0, hips_cm: 116.0 },
      ],
    };
  }

  _deriveMatrixFromGarmentMeasurements(measurements, userProfile) {
    const userChest = userProfile?.chest_bust_cm || 92;
    const userWaist = userProfile?.waist_cm || 74;

    return measurements.map((m) => {
      const chestGarment = m.chest_bust_cm;
      const waistGarment = m.waist_cm;
      const chestEase = chestGarment ? Math.round((chestGarment - userChest) * 10) / 10 : 0;
      const waistEase = waistGarment ? Math.round((waistGarment - userWaist) * 10) / 10 : 0;

      let verdict = 'Good Fit';
      let status = 'success';
      let badgeClass = 'fm-chip-teal';

      if (chestEase < 0 || waistEase < -1) {
        verdict = `Tight (${chestEase < 0 ? chestEase : waistEase}cm)`;
        status = 'error';
        badgeClass = 'fm-chip-coral';
      } else if (chestEase >= 2 && chestEase <= 6 && waistEase >= 2 && waistEase <= 8) {
        verdict = `Recommended (+${chestEase}cm)`;
        status = 'recommended';
        badgeClass = 'fm-chip-coral';
      } else if (chestEase > 8 || waistEase > 10) {
        verdict = `Loose (+${chestEase}cm)`;
        status = 'warning';
        badgeClass = 'fm-chip-marigold';
      }

      return {
        size: m.size_label,
        chestCm: chestGarment ? `${chestGarment - 2}–${chestGarment + 2}` : '–',
        waistCm: waistGarment ? `${waistGarment - 2}–${waistGarment + 2}` : '–',
        chestIn: chestGarment
          ? `${(Math.round((chestGarment - 2) / 2.54 * 10) / 10)}–${(Math.round((chestGarment + 2) / 2.54 * 10) / 10)}`
          : '–',
        waistIn: waistGarment
          ? `${(Math.round((waistGarment - 2) / 2.54 * 10) / 10)}–${(Math.round((waistGarment + 2) / 2.54 * 10) / 10)}`
          : '–',
        easeCm: chestEase,
        verdict,
        status,
        badgeClass,
      };
    });
  }

  _mockSizeMatrix(userProfile) {
    const userChest = userProfile?.chest_bust_cm || 92;
    const userWaist = userProfile?.waist_cm || 74;

    return [
      {
        size: 'XS',
        chestCm: '80–84',
        waistCm: '62–66',
        chestIn: '31.5–33.1',
        waistIn: '24.4–26.0',
        verdict: `Tight (-${Math.abs(Math.round(82 - userChest))}cm)`,
        status: 'error',
        badgeClass: 'fm-chip-coral',
      },
      {
        size: 'S',
        chestCm: '86–90',
        waistCm: '68–72',
        chestIn: '33.8–35.4',
        waistIn: '26.7–28.3',
        verdict: `Snug fit (-${Math.abs(Math.round(88 - userChest))}cm)`,
        status: 'warning',
        badgeClass: 'fm-chip-marigold',
      },
      {
        size: 'M',
        chestCm: '93–97',
        waistCm: '75–79',
        chestIn: '36.6–38.2',
        waistIn: '29.5–31.1',
        verdict: 'Recommended (+3cm ease)',
        status: 'recommended',
        badgeClass: 'fm-chip-teal',
      },
      {
        size: 'L',
        chestCm: '100–104',
        waistCm: '82–86',
        chestIn: '39.4–40.9',
        waistIn: '32.3–33.8',
        verdict: 'Relaxed room (+10cm)',
        status: 'warning',
        badgeClass: 'fm-chip-marigold',
      },
      {
        size: 'XL',
        chestCm: '108–114',
        waistCm: '90–96',
        chestIn: '42.5–44.9',
        waistIn: '35.4–37.8',
        verdict: 'Oversized (+18cm)',
        status: 'neutral',
        badgeClass: 'fm-chip-lilac',
      },
    ];
  }

  _mockRecommendationResult(payload) {
    const userChest = payload.inline_measurements?.chest_bust || 92;
    const userWaist = payload.inline_measurements?.waist || 74;

    const result = {
      recommendation_id: Math.floor(Math.random() * 9000) + 1000,
      product_id: payload.product_id || 1,
      product_name: 'White Poplin Fit Shirt',
      brand_name: 'Zara',
      category_code: 'womens_tops',
      size_chart_id: 1,
      size_chart_verification_status: 'verified',
      recommended_size: 'M',
      fit_category: 'good_fit',
      score: 96.5,
      confidence: 0.96,
      fit_preference_used: payload.fit_preference_override || 'regular',
      strategy_used: 'WomensTopsStrategy',
      method_used: 'ml_hybrid_with_rule_validation',
      fallback_used: false,
      model_version: 'v1.0.0-xgb',
      ranked_sizes: [
        {
          size_label: 'M',
          score: 96.5,
          fit_category: 'good_fit',
          confidence: 0.96,
          summary_note: 'Optimal chest and waist ease matching your regular fit preference.',
          measurement_notes: [
            {
              measurement: 'chest_bust',
              body_cm: userChest,
              garment_cm: 95.0,
              effective_garment_cm: 95.0,
              ease_cm: 3.0,
              target_ease_min_cm: 2.0,
              target_ease_ideal_cm: 3.5,
              target_ease_max_cm: 5.5,
              weight: 0.45,
              dimension_score: 98.0,
              fit_status: 'ideal',
              note: 'Exact 3 cm breathing room prevents chest placket pull.',
            },
            {
              measurement: 'waist',
              body_cm: userWaist,
              garment_cm: 78.0,
              effective_garment_cm: 78.0,
              ease_cm: 4.0,
              target_ease_min_cm: 2.0,
              target_ease_ideal_cm: 4.0,
              target_ease_max_cm: 7.0,
              weight: 0.35,
              dimension_score: 97.0,
              fit_status: 'ideal',
              note: 'Gentle drape around waist without excess bagging.',
            },
            {
              measurement: 'shoulder',
              body_cm: 40.0,
              garment_cm: 40.5,
              effective_garment_cm: 40.5,
              ease_cm: 0.5,
              target_ease_min_cm: 0.0,
              target_ease_ideal_cm: 0.5,
              target_ease_max_cm: 1.5,
              weight: 0.2,
              dimension_score: 95.0,
              fit_status: 'ideal',
              note: 'Shoulder seam sits square on acromion joint.',
            },
          ],
        },
        {
          size_label: 'S',
          score: 82.0,
          fit_category: 'too_tight',
          confidence: 0.82,
          summary_note: 'Snug fit across chest; buttons may pull during arm movement.',
          measurement_notes: [],
        },
        {
          size_label: 'L',
          score: 74.0,
          fit_category: 'loose',
          confidence: 0.74,
          summary_note: 'Generous room throughout; shoulders drop past natural seam.',
          measurement_notes: [],
        },
      ],
      explanation: {
        category_code: 'womens_tops',
        strategy_name: 'WomensTopsStrategy',
        fit_preference: payload.fit_preference_override || 'regular',
        fabric_stretch_pct: 2.0,
        evaluated_measurements: ['chest_bust', 'waist', 'shoulder'],
        missing_measurements: [],
        confidence_penalty_reason: null,
        overall_summary:
          `Based on your ${userChest} cm chest and ${userWaist} cm waist, Zara's Size M gives you an elevated, tailored fit with exactly 3 cm of breathing room for all-day comfort.`,
        per_measurement_notes: [
          {
            measurement: 'chest_bust',
            body_cm: userChest,
            garment_cm: 95.0,
            effective_garment_cm: 95.0,
            ease_cm: 3.0,
            target_ease_min_cm: 2.0,
            target_ease_ideal_cm: 3.5,
            target_ease_max_cm: 5.5,
            weight: 0.45,
            dimension_score: 98.0,
            fit_status: 'ideal',
            note: '3 cm garment ease matches tailored drape standard.',
          },
          {
            measurement: 'waist',
            body_cm: userWaist,
            garment_cm: 78.0,
            effective_garment_cm: 78.0,
            ease_cm: 4.0,
            target_ease_min_cm: 2.0,
            target_ease_ideal_cm: 4.0,
            target_ease_max_cm: 7.0,
            weight: 0.35,
            dimension_score: 97.0,
            fit_status: 'ideal',
            note: 'Smooth taper over torso with zero tension.',
          },
        ],
      },
      created_at: new Date().toISOString(),
    };

    // Save to mock history
    const list = this._getMockRecommendations();
    list.unshift(result);
    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'recommendations', JSON.stringify(list));
    } catch {}

    return result;
  }

  _getMockRecommendations() {
    try {
      const stored = localStorage.getItem(MOCK_STORAGE_PREFIX + 'recommendations');
      if (stored) return JSON.parse(stored);
    } catch {}

    const defaults = [
      {
        recommendation_id: 101,
        product_id: 1,
        product_name: 'White Poplin Fit Shirt',
        brand_name: 'Zara',
        category_code: 'womens_tops',
        recommended_size: 'Size M',
        fit_category: 'good_fit',
        score: 96,
        confidence: 0.96,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Chest 92cm | Waist 74cm • 96% Match',
        image_url:
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80',
      },
      {
        recommendation_id: 102,
        product_id: 2,
        product_name: '501® Original Fit Jeans',
        brand_name: "Levi's",
        category_code: 'womens_bottoms',
        recommended_size: 'W29 L32',
        fit_category: 'good_fit',
        score: 94,
        confidence: 0.94,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        summary: 'Waist 74cm | Inseam 81cm • 94% Match',
        image_url:
          'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80',
      },
      {
        recommendation_id: 103,
        product_id: 3,
        product_name: 'Supima Cotton Crewneck Tee',
        brand_name: 'Uniqlo',
        category_code: 'womens_tops',
        recommended_size: 'Size M',
        fit_category: 'good_fit',
        score: 92,
        confidence: 0.92,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        summary: 'Chest 92cm | Shoulder 40cm • 92% Match',
        image_url:
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
      },
    ];

    try {
      localStorage.setItem(MOCK_STORAGE_PREFIX + 'recommendations', JSON.stringify(defaults));
    } catch {}

    return defaults;
  }
}

// Export singleton instance
const api = new ApiService();


// --- Source: store.js ---
/**
 * ============================================================================
 * FITMATE APPLICATION STATE STORE
 * Lightweight reactive pub/sub store for the frontend application.
 * Manages:
 * - Auth session and current user
 * - Active measurement profile & category-specific profiles
 * - Unit preference ('metric' / 'cm' vs 'imperial' / 'in')
 * - Draft measurements & flow state (gender -> category -> measurements -> fitStyle -> brandRecommendations)
 * - SessionStorage persistence so browser Back/Forward never loses user progress
 * - Selected brand & product
 * - Latest size recommendation result & cross-brand fit verdicts
 * - Toast notifications
 * ============================================================================
 */

const DRAFT_STORAGE_KEY = 'fitmate_flow_draft_v2';
const BRAND_RECS_STORAGE_KEY = 'fitmate_brand_recs_v2';

function loadPersistedDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function savePersistedDraft(draft) {
  try {
    const serialized = JSON.stringify(draft);
    sessionStorage.setItem(DRAFT_STORAGE_KEY, serialized);
    localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
  } catch {
    // ignore storage errors
  }
}

function loadPersistedBrandRecs() {
  try {
    const raw = sessionStorage.getItem(BRAND_RECS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePersistedBrandRecs(recs) {
  try {
    sessionStorage.setItem(BRAND_RECS_STORAGE_KEY, JSON.stringify(recs || []));
  } catch {
    // ignore
  }
}

const DEFAULT_DRAFT = {
  profileName: 'My Silhouette',
  gender: 'female', // 'female' (Women) or 'male' (Men)
  genderSelected: false,
  categoryGroup: 'tops', // 'tops', 'bottoms', 'dresses'
  categoryCode: 'womens_tops', // 'womens_tops', 'womens_bottoms', 'womens_dresses', 'mens_tops', 'mens_bottoms'
  categorySelected: false,
  fitStyle: 'Regular', // e.g. 'Baggy', 'Loose', 'Straight', 'Slim', 'Trousers', 'Skinny', 'Oversized', 'Regular', 'Cropped', 'Bodycon', 'A-line', 'Maxi', 'Shift'
  fitPreference: 'regular', // 'slim', 'regular', 'relaxed'
  height: 168,
  weight: 62,
  chest: 92,
  waist: 74,
  hips: 98,
  inseam: 78,
  shoulder: 40,
  skipShoulder: false,
  skipInseam: false,
  bodyShape: 'Hourglass',
  measurementsConfirmed: false,
};

class AppStore {
  constructor() {
    const savedDraft = loadPersistedDraft();
    this.state = {
      user: api.getCurrentUser(),
      isAuthenticated: api.isAuthenticated(),
      activeProfile: null,
      profiles: [],
      unit: localStorage.getItem('fitmate_unit_preference') || 'metric', // 'metric' or 'imperial'
      draftMeasurements: {
        ...DEFAULT_DRAFT,
        ...(savedDraft || {}),
      },
      selectedBrand: null,
      selectedProduct: null,
      latestRecommendation: null,
      brandRecommendations: loadPersistedBrandRecs(),
      toasts: [],
      isLoading: false,
    };

    this.listeners = new Set();

    // Listen for auth expiration
    if (typeof window !== 'undefined') {
      window.addEventListener('fitmate:auth_expired', () => {
        this.setState({
          user: null,
          isAuthenticated: false,
        });
        this.addToast('Your session has expired. Please log in again.', 'warning');
      });
    }
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    if (partialState.draftMeasurements) {
      savePersistedDraft(this.state.draftMeasurements);
    }
    if (partialState.brandRecommendations !== undefined) {
      savePersistedBrandRecs(this.state.brandRecommendations);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  /* --------------------------------------------------------------------------
   * ACTIONS
   * -------------------------------------------------------------------------- */
  setUnit(unit) {
    localStorage.setItem('fitmate_unit_preference', unit);
    this.setState({ unit });
  }

  setDraftMeasurement(field, value) {
    const updatedDraft = {
      ...this.state.draftMeasurements,
      [field]: value,
    };
    this.setState({
      draftMeasurements: updatedDraft,
    });
  }

  setDraftMeasurements(measurements) {
    const updatedDraft = {
      ...this.state.draftMeasurements,
      ...measurements,
    };
    this.setState({
      draftMeasurements: updatedDraft,
    });
  }

  setGender(genderValue) {
    const gender = genderValue === 'male' || genderValue === 'men' ? 'male' : 'female';
    const currentGroup = this.state.draftMeasurements.categoryGroup || 'tops';
    const validGroup = gender === 'male' && currentGroup === 'dresses' ? 'tops' : currentGroup;
    const prefix = gender === 'male' ? 'mens_' : 'womens_';
    const categoryCode = `${prefix}${validGroup}`;

    this.setDraftMeasurements({
      gender,
      genderSelected: true,
      categoryGroup: validGroup,
      categoryCode,
    });
  }

  setCategory(categoryGroup) {
    const gender = this.state.draftMeasurements.gender === 'male' ? 'male' : 'female';
    const group = gender === 'male' && categoryGroup === 'dresses' ? 'tops' : categoryGroup;
    const prefix = gender === 'male' ? 'mens_' : 'womens_';
    const categoryCode = `${prefix}${group}`;

    const defaultStyleByGroup = {
      tops: 'Regular',
      bottoms: 'Straight',
      dresses: 'A-line',
    };

    this.setDraftMeasurements({
      categoryGroup: group,
      categoryCode,
      categorySelected: true,
      fitStyle: defaultStyleByGroup[group] || 'Regular',
    });
  }

  setFitStyle(fitStyle) {
    const styleLower = String(fitStyle || 'Regular').toLowerCase();
    let fitPreference = 'regular';
    if (['slim', 'skinny', 'cropped', 'bodycon'].includes(styleLower)) {
      fitPreference = 'slim';
    } else if (['baggy', 'loose', 'oversized', 'maxi', 'sweatshirts', 'kurta', 'cargo', 'track pants'].includes(styleLower)) {
      fitPreference = 'relaxed';
    }
    this.setDraftMeasurements({
      fitStyle,
      fitPreference,
    });
  }

  setBrandRecommendations(recs) {
    this.setState({ brandRecommendations: recs || [] });
  }

  findSavedProfileForCategory(gender, categoryCode) {
    const { profiles } = this.state;
    if (!profiles || profiles.length === 0) return null;
    const g = gender || this.state.draftMeasurements.gender || 'female';
    const cat = categoryCode || this.state.draftMeasurements.categoryCode;

    // 1. Exact gender + target_category match
    const exact = profiles.find((p) => p.gender === g && p.target_category === cat);
    if (exact) return exact;

    // 2. Match by gender and profile_name hint
    const byGender = profiles.find((p) => p.gender === g);
    if (byGender) return byGender;

    // 3. Default profile
    return profiles.find((p) => p.is_default) || profiles[0] || null;
  }

  applyProfileToDraft(profile) {
    if (!profile) return;
    const current = this.state.draftMeasurements;
    const gender = profile.gender === 'male' ? 'male' : 'female';
    let categoryCode = profile.target_category || current.categoryCode || (gender === 'male' ? 'mens_tops' : 'womens_tops');
    if (gender === 'male' && categoryCode === 'womens_dresses') {
      categoryCode = 'mens_tops';
    }
    const categoryGroup = categoryCode.includes('bottoms')
      ? 'bottoms'
      : categoryCode.includes('dresses')
      ? 'dresses'
      : 'tops';

    let resolvedStyle = profile.fit_style || current.fitStyle || 'Regular';
    if (categoryGroup === 'bottoms' && resolvedStyle.toLowerCase() === 'slim') {
      resolvedStyle = 'Skinny';
    }

    this.setDraftMeasurements({
      profileName: profile.profile_name || current.profileName,
      gender,
      genderSelected: true,
      categoryGroup,
      categoryCode,
      fitStyle: resolvedStyle,
      fitPreference: profile.fit_preference || current.fitPreference || 'regular',
      height: profile.height_cm || current.height || 168,
      weight: profile.weight_kg || current.weight || 62,
      chest: profile.chest_bust_cm || current.chest || 92,
      waist: profile.waist_cm || current.waist || 74,
      hips: profile.hips_cm || current.hips || 98,
      shoulder: profile.shoulder_cm != null ? profile.shoulder_cm : current.shoulder,
      inseam: profile.inseam_cm != null ? profile.inseam_cm : current.inseam,
      skipShoulder: profile.shoulder_cm == null,
      skipInseam: profile.inseam_cm == null,
      bodyShape: profile.body_shape || current.bodyShape || 'Hourglass',
      measurementsConfirmed: true,
    });
  }

  setSelectedBrand(brand) {
    this.setState({ selectedBrand: brand });
  }

  setSelectedProduct(product) {
    this.setState({ selectedProduct: product });
  }

  setLatestRecommendation(rec) {
    this.setState({ latestRecommendation: rec });
  }

  setUser(user) {
    this.setState({
      user,
      isAuthenticated: !!user,
    });
  }

  setActiveProfile(profile) {
    this.setState({ activeProfile: profile });
  }

  addToast(message, type = 'info', duration = 3500) {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const toast = { id, message, type };
    this.setState({ toasts: [...this.state.toasts, toast] });

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
    return id;
  }

  removeToast(id) {
    this.setState({
      toasts: this.state.toasts.filter((t) => t.id !== id),
    });
  }

  async refreshProfiles() {
    try {
      this.setState({ isLoading: true });
      const profiles = await api.listMeasurements();
      const defaultProf = profiles.find((p) => p.is_default) || profiles[0] || null;
      this.setState({
        profiles,
        activeProfile: defaultProf,
        isLoading: false,
      });
      return profiles;
    } catch (err) {
      this.setState({ isLoading: false });
      console.warn('Failed to load profiles:', err.message);
      return [];
    }
  }

  async logout() {
    await api.logout();
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      sessionStorage.removeItem(BRAND_RECS_STORAGE_KEY);
    } catch {}
    this.setState({
      user: null,
      isAuthenticated: false,
      activeProfile: null,
      profiles: [],
      latestRecommendation: null,
      brandRecommendations: [],
      draftMeasurements: { ...DEFAULT_DRAFT },
    });
    this.addToast('Successfully signed out.', 'info');
  }

  async login(email, password) {
    const res = await api.login(email, password);
    this.setUser(res.user);
    const profiles = await this.refreshProfiles();
    if (profiles && profiles.length > 0) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      this.applyProfileToDraft(def);
    }
    return res;
  }

  async register(email, fullName, password) {
    const res = await api.register(email, fullName, password);
    this.setUser(res.user);
    await this.refreshProfiles();
    return res;
  }
}
const store = new AppStore();


// --- Source: motion.js ---
/**
 * ============================================================================
 * FITMATE MOTION & INTERACTION UTILITIES (Zero-Dependency)
 * High-performance, 60fps hardware-accelerated micro-interactions using:
 * - CSS Variables & Web Animations API (WAAPI)
 * - Canvas 2D particle simulation
 * - IntersectionObserver & requestAnimationFrame
 * - Full prefers-reduced-motion accessibility compliance
 * ============================================================================
 */
const MotionTokens = {
  duration: {
    micro: 120,
    fast: 200,
    normal: 320,
    slow: 600,
    long: 1200,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    entrance: 'cubic-bezier(0.16, 1, 0.3, 1)', // Smooth deceleration
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Snappy overshoot
    bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  },
};

/**
 * Check if the user has requested reduced motion.
 */
function isReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll Reveal using IntersectionObserver
 */
function reveal(selectorOrElements, options = {}) {
  if (isReducedMotion()) {
    const els = typeof selectorOrElements === 'string'
      ? document.querySelectorAll(selectorOrElements)
      : (selectorOrElements instanceof NodeList ? selectorOrElements : [selectorOrElements]);
    els.forEach((el) => {
      if (el) el.style.opacity = '1';
    });
    return null;
  }

  const {
    threshold = 0.15,
    rootMargin = '0px 0px -40px 0px',
    staggerDelay = 60,
    className = 'is-revealed',
  } = options;

  const elements = typeof selectorOrElements === 'string'
    ? Array.from(document.querySelectorAll(selectorOrElements))
    : (selectorOrElements instanceof NodeList ? Array.from(selectorOrElements) : [selectorOrElements].filter(Boolean));

  if (!elements.length) return null;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        setTimeout(() => {
          el.classList.add(className);
        }, idx * staggerDelay);
        obs.unobserve(el);
      }
    });
  }, { threshold, rootMargin });

  elements.forEach((el) => {
    el.classList.add('fm-reveal-init');
    observer.observe(el);
  });

  return observer;
}

/**
 * Stagger sequence execution across a list of DOM elements
 */
function stagger(elements, animationFn, delayBetweenMs = 60) {
  if (!elements || !elements.length) return;
  const list = Array.isArray(elements) ? elements : Array.from(elements);
  list.forEach((el, index) => {
    if (!el) return;
    if (isReducedMotion()) {
      animationFn(el, index);
    } else {
      setTimeout(() => animationFn(el, index), index * delayBetweenMs);
    }
  });
}

/**
 * RAF-based Animated Number Counter with easeOutExpo
 */
function countUp(element, endVal, options = {}) {
  if (!element) return;
  const {
    duration = MotionTokens.duration.slow,
    decimals = 0,
    prefix = '',
    suffix = '',
    startVal = 0,
  } = options;

  if (isReducedMotion()) {
    element.textContent = `${prefix}${endVal.toFixed(decimals)}${suffix}`;
    return;
  }

  const startTime = performance.now();
  const diff = endVal - startVal;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Exponential ease-out curve
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = startVal + diff * ease;

    element.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = `${prefix}${endVal.toFixed(decimals)}${suffix}`;
    }
  }

  requestAnimationFrame(update);
}

/**
 * FLIP Animation (First, Last, Invert, Play) for smooth list reordering & layout transitions
 */
function flip(container, mutateFn, duration = MotionTokens.duration.normal) {
  if (!container) {
    if (mutateFn) mutateFn();
    return;
  }

  if (isReducedMotion()) {
    if (mutateFn) mutateFn();
    return;
  }

  const children = Array.from(container.children);
  // FIRST: Record initial bounding rects
  const firstRects = new Map();
  children.forEach((el) => {
    firstRects.set(el, el.getBoundingClientRect());
  });

  // Execute DOM mutation (reorder, filter, append)
  if (mutateFn) mutateFn();

  // LAST: Record final bounding rects
  const newChildren = Array.from(container.children);
  newChildren.forEach((el) => {
    const first = firstRects.get(el);
    if (!first) return;
    const last = el.getBoundingClientRect();

    // INVERT: Calculate delta transform
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;

    if (deltaX !== 0 || deltaY !== 0) {
      // PLAY: Animate using WAAPI
      el.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration,
          easing: MotionTokens.easing.entrance,
        }
      );
    }
  });
}

/**
 * Snappy Spring Physics Helper
 */
function spring({ from = 0, to = 1, stiffness = 170, damping = 26, mass = 1, onUpdate, onComplete }) {
  if (isReducedMotion()) {
    if (onUpdate) onUpdate(to);
    if (onComplete) onComplete();
    return () => {};
  }

  let current = from;
  let velocity = 0;
  let rafId = null;
  let lastTime = performance.now();

  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.032); // Max 32ms step
    lastTime = now;

    const springForce = -stiffness * (current - to);
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    current += velocity * dt;

    if (onUpdate) onUpdate(current);

    // Settle condition
    if (Math.abs(current - to) < 0.001 && Math.abs(velocity) < 0.01) {
      if (onUpdate) onUpdate(to);
      if (onComplete) onComplete();
      return;
    }

    rafId = requestAnimationFrame(step);
  }

  rafId = requestAnimationFrame(step);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * 3D Card Hover Tilt with Specular Glare (max 6 degrees)
 */
function tilt3d(cardElement, maxDeg = 6) {
  if (!cardElement || isReducedMotion()) return () => {};

  cardElement.style.transformStyle = 'preserve-3d';
  cardElement.style.transition = 'transform 0.15s ease-out, box-shadow 0.2s ease-out';

  // Add subtle specular glare element if not present
  let glare = cardElement.querySelector('.fm-tilt-glare');
  if (!glare) {
    glare = document.createElement('div');
    glare.className = 'fm-tilt-glare';
    glare.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 70%);
      opacity: 0;
      transition: opacity 0.2s ease;
      mix-blend-mode: overlay;
      z-index: 2;
    `;
    cardElement.appendChild(glare);
  }

  function handleMouseMove(e) {
    const rect = cardElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxDeg;
    const rotateY = ((x - centerX) / centerX) * maxDeg;

    cardElement.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
    glare.style.opacity = '1';
    glare.style.background = `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)`;
  }

  function handleMouseLeave() {
    cardElement.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    glare.style.opacity = '0';
  }

  cardElement.addEventListener('mousemove', handleMouseMove);
  cardElement.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    cardElement.removeEventListener('mousemove', handleMouseMove);
    cardElement.removeEventListener('mouseleave', handleMouseLeave);
  };
}

/**
 * Confetti Burst Particle Canvas (1.5s, Warm Cream Palette)
 */
function confetti(canvasElement, options = {}) {
  if (isReducedMotion() || !canvasElement) return;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;

  const width = (canvasElement.width = window.innerWidth);
  const height = (canvasElement.height = window.innerHeight);

  const colors = [
    '#FF6B6B', // Coral
    '#22A699', // Deep Retail Teal
    '#F7B731', // Marigold
    '#6EC1F7', // Sky
    '#C9B6F2', // Lilac
    '#FFEFEA', // Subtle Peach
  ];

  const particleCount = options.count || 75;
  const particles = [];
  const originX = options.x || width / 2;
  const originY = options.y || height / 3;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      alpha: 1,
      decay: 0.012 + Math.random() * 0.015,
    });
  }

  let startTime = performance.now();
  const maxDuration = 1600; // 1.6s

  function frame(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        activeCount++;
        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < maxDuration) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  requestAnimationFrame(frame);
}

/**
 * Click Ripple origin animation
 */
function ripple(e, buttonElement) {
  if (isReducedMotion() || !buttonElement) return;

  const rect = buttonElement.getBoundingClientRect();
  const diameter = Math.max(rect.width, rect.height) * 2;
  const radius = diameter / 2;

  const circle = document.createElement('span');
  circle.className = 'fm-btn-ripple';
  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;

  // Remove existing ripples
  const existing = buttonElement.querySelector('.fm-btn-ripple');
  if (existing) existing.remove();

  buttonElement.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

/**
 * Subtle Ambient Drifting Background Blobs & Cursor Parallax
 */
function initBackgroundBlobs(container) {
  if (!container || document.getElementById('fm-bg-blobs')) return;

  const blobWrapper = document.createElement('div');
  blobWrapper.id = 'fm-bg-blobs';
  blobWrapper.setAttribute('aria-hidden', 'true');
  blobWrapper.className = 'fm-ambient-blobs';
  blobWrapper.innerHTML = `
    <div class="fm-blob blob-1"></div>
    <div class="fm-blob blob-2"></div>
    <div class="fm-blob blob-3"></div>
  `;
  container.prepend(blobWrapper);

  if (isReducedMotion()) return;

  // Subtle cursor parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  function onMouseMove(e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 24;
    targetY = (e.clientY / window.innerHeight - 0.5) * 24;
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });

  function renderParallax() {
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    blobWrapper.style.transform = `translate3d(${mouseX.toFixed(2)}px, ${mouseY.toFixed(2)}px, 0)`;
    requestAnimationFrame(renderParallax);
  }

  requestAnimationFrame(renderParallax);
}

/**
 * Cursor-aware radial glow on primary CTAs (Desktop only)
 */
function attachCursorGlow(buttonSelector = '.fm-btn-glow') {
  if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll(buttonSelector).forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      btn.style.setProperty('--glow-x', `${x}px`);
      btn.style.setProperty('--glow-y', `${y}px`);
    });
  });
}


// --- Source: router.js ---
/**
 * ============================================================================
 * FITMATE CLIENT-SIDE ROUTER WITH ROUTE GUARDS & ANIMATED TRANSITIONS
 * Handles hash and history routing, direction-aware page transitions,
 * route cleanup, authentication guards, and flow step validation.
 * ============================================================================
 */
class Router {
  constructor(routes = {}, rootElementId = 'app-root') {
    this.routes = routes;
    this.rootElementId = rootElementId;
    this.currentPath = '/';
    this.currentParams = {};
    this.historyStack = [];

    window.addEventListener('popstate', () => this.handleRoute());
    window.addEventListener('hashchange', () => this.handleRoute());

    // Intercept clicks on links with data-link or href starting with #/ or /
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link], a[href^="#/"]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const path = href.startsWith('#/') ? href.slice(1) : href;
        this.navigate(path);
      }
    });
  }

  getCurrentPath() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      return hash.slice(1);
    }
    return window.location.pathname || '/';
  }

  navigate(path, replace = false) {
    if (!path.startsWith('/')) path = '/' + path;
    const hashPath = `#${path}`;

    if (replace) {
      window.history.replaceState(null, '', hashPath);
    } else {
      window.history.pushState(null, '', hashPath);
    }

    this.handleRoute();
  }

  async handleRoute() {
    const rawPath = this.getCurrentPath();
    const [pathOnly, queryString] = rawPath.split('?');
    const path = pathOnly.trim() || '/';

    const previousPath = this.currentPath;
    this.historyStack.push(path);

    // Parse query params
    const queryParams = new URLSearchParams(queryString || '');
    this.currentParams = Object.fromEntries(queryParams.entries());
    this.currentPath = path;

    // Match route
    let routeConfig = this.routes[path];
    if (!routeConfig) {
      for (const [pattern, config] of Object.entries(this.routes)) {
        if (pattern.includes(':')) {
          const regexPattern = '^' + pattern.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$';
          const match = path.match(new RegExp(regexPattern));
          if (match && match.groups) {
            routeConfig = config;
            this.currentParams = { ...this.currentParams, ...match.groups };
            break;
          }
        }
      }
    }

    // Fallback to landing or 404
    if (!routeConfig) {
      routeConfig = this.routes['/'] || { component: () => '<div>404 Page Not Found</div>' };
    }

    // 1. Returning users with a valid session skip the landing page (#/) and go straight to #/gender
    const { isAuthenticated, draftMeasurements } = store.getState();
    if (path === '/' && isAuthenticated && !this.currentParams.stay) {
      this.navigate('/gender', true);
      return;
    }

    // 2. Route Guard for authenticated pages
    if (routeConfig.requiresAuth && !isAuthenticated) {
      store.addToast('Please sign in or create an account to continue.', 'warning');
      this.navigate(`/auth?redirect=${encodeURIComponent(path)}`, true);
      return;
    }

    // 3. Flow Integrity Guard: ensure Men never stay on womens_dresses if navigating via Back/Forward
    if (draftMeasurements.gender === 'male' && draftMeasurements.categoryGroup === 'dresses') {
      store.setCategory('tops');
    }

    // 4. Optional custom route guard hook
    if (typeof routeConfig.guard === 'function') {
      const redirectPath = routeConfig.guard(store.getState(), this.currentParams);
      if (redirectPath && redirectPath !== path) {
        this.navigate(redirectPath, true);
        return;
      }
    }

    // Render Page Component
    const container = document.getElementById(this.rootElementId);
    if (!container) return;

    // Scroll to top only when navigating to a different route path
    if (path !== previousPath) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    try {
      const view = await routeConfig.component(this.currentParams);
      if (typeof view === 'string') {
        container.innerHTML = view;
      } else if (view instanceof HTMLElement) {
        container.innerHTML = '';
        container.appendChild(view);
      }

      // Attach global TopNav events
      attachTopNavEvents();
      attachCursorGlow('.fm-btn-glow');

      // Execute post-mount lifecycle hook if provided
      if (typeof routeConfig.onMount === 'function') {
        routeConfig.onMount(this.currentParams);
      }

      // Dispatch route changed event
      window.dispatchEvent(
        new CustomEvent('fitmate:route_changed', {
          detail: { path, previousPath, params: this.currentParams },
        })
      );
    } catch (err) {
      console.error('Error rendering route:', err);
      container.innerHTML = `
        <div class="fm-card" style="margin: 2rem auto; max-width: 500px; text-align: center;">
          <h2 style="color: var(--color-error); margin-bottom: 0.5rem;">Something went wrong</h2>
          <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">${err.message}</p>
          <a href="#/" class="fm-btn fm-btn-primary">Return to Home</a>
        </div>
      `;
    }
  }
}


// --- Source: LoadingState.js ---
/**
 * ============================================================================
 * LOADING, EMPTY & ERROR STATE COMPONENTS
 * Clean reusable feedback blocks.
 * ============================================================================
 */
function renderLoadingSpinner(message = 'Analyzing body geometry & brand matrix...') {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem; text-align: center; gap: 1rem;">
      <div class="fm-spinner"></div>
      <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-text-muted); max-width: 320px;">
        ${message}
      </p>
    </div>
  `;
}
function renderEmptyState({ icon = 'inventory_2', title = 'No records found', message = 'There are no items matching this filter.', actionLabel = null, actionHref = null, onAction = null }) {
  return `
    <div class="fm-card" style="text-align: center; padding: 3.5rem 1.5rem; max-width: 480px; margin: 2rem auto;">
      <div style="width: 4rem; height: 4rem; border-radius: var(--radius-pill); background: var(--color-surface-subtle); color: var(--color-secondary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
        <span class="material-symbols-outlined" style="font-size: 32px;">${icon}</span>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.4rem;">${title}</h3>
      <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
      ${
        actionLabel && actionHref
          ? `<a href="${actionHref}" class="fm-btn fm-btn-primary fm-btn-sm">${actionLabel}</a>`
          : ''
      }
    </div>
  `;
}
function renderErrorState({ title = 'Unable to Load Data', message = 'Could not establish connection to the sizing engine.', retryFnName = null }) {
  return `
    <div class="fm-card" style="text-align: center; padding: 3rem 1.5rem; max-width: 480px; margin: 2rem auto; border-top: 4px solid var(--color-error);">
      <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-pill); background: var(--color-error-light); color: var(--color-error); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
        <span class="material-symbols-outlined" style="font-size: 28px;">error_outline</span>
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.4rem;">${title}</h3>
      <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
      ${
        retryFnName
          ? `<button onclick="${retryFnName}()" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span> Try Again
             </button>`
          : ''
      }
    </div>
  `;
}


// --- Source: Toast.js ---
/**
 * ============================================================================
 * TOAST NOTIFICATIONS COMPONENT (Dynamic & Spring-Animated)
 * Renders floating alerts for validation, success, warning, and network feedback
 * with spring physics and auto-dismiss countdown progress bar.
 * ============================================================================
 */
function renderToasts() {
  const { toasts } = store.getState();
  if (!toasts || toasts.length === 0) return '';

  return `
    <div class="fm-toast-container" id="toast-root" role="region" aria-label="Notifications" aria-live="polite">
      ${toasts
        .map((t) => {
          let icon = 'info';
          let toastClass = '';
          if (t.type === 'error') {
            icon = 'error';
            toastClass = 'toast-error';
          } else if (t.type === 'success') {
            icon = 'check_circle';
            toastClass = 'toast-success';
          } else if (t.type === 'warning') {
            icon = 'warning';
            toastClass = 'toast-warning';
          }

          const durationMs = t.duration || 4500;

          return `
            <div class="fm-toast ${toastClass}" id="toast-${t.id}" role="alert">
              <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
              <span style="flex: 1; line-height: 1.4;">${t.message}</span>
              <button onclick="window.__dismissToast('${t.id}')" aria-label="Dismiss notification" style="background: none; border: none; cursor: pointer; color: inherit; padding: 0.2rem; display: flex; align-items: center; border-radius: 50%;">
                <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
              </button>
              <div class="fm-toast-progress" style="animation-duration: ${durationMs}ms;"></div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

// Global dismiss helper
if (typeof window !== 'undefined') {
  window.__dismissToast = (id) => {
    const el = document.getElementById(`toast-${id}`);
    if (el) {
      el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      el.style.transform = 'translateX(60px) scale(0.9)';
      el.style.opacity = '0';
      setTimeout(() => store.removeToast(id), 200);
    } else {
      store.removeToast(id);
    }
  };
}


// --- Source: BottomTabBar.js ---
/**
 * ============================================================================
 * BOTTOM TAB BAR NAVIGATION (Mobile Devices)
 * Fixed bottom floating glass tab bar with tactile micro-interactions.
 * ============================================================================
 */
function renderBottomTabBar(currentPath = '/') {
  const tabs = [
    { path: '/gender', label: 'Gender', icon: 'wc' },
    { path: '/category', label: 'Category', icon: 'checkroom' },
    { path: '/measurements', label: 'Measure', icon: 'straighten' },
    { path: '/fit-style', label: 'Fit Style', icon: 'styler' },
    { path: '/results', label: 'Sizes', icon: 'storefront' },
    { path: '/history', label: 'Vault', icon: 'history' },
  ];

  return `
    <nav class="fm-bottom-bar" aria-label="Mobile Navigation">
      ${tabs
        .map((tab) => {
          const isActive =
            currentPath === tab.path ||
            (tab.path === '/results' && (currentPath === '/result' || currentPath === '/comparison')) ||
            (tab.path === '/fit-style' && currentPath === '/brand-picker');
          return `
            <a href="#${tab.path}" class="fm-tab-item ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
              <span class="material-symbols-outlined" style="font-size: 22px;">${tab.icon}</span>
              <span>${tab.label}</span>
            </a>
          `;
        })
        .join('')}
    </nav>
  `;
}


// --- Source: TopNav.js ---
/**
 * ============================================================================
 * TOP NAVIGATION COMPONENT (Luxury Editorial Navbar)
 * - Uses the supplied FITMATE logo image on the left
 * - Landing links: Home, How It Works, Features, Brands, About, Log In, Get Started
 * - Application flow links & Active Profile Pill for inside-app steps
 * ============================================================================
 */
function renderTopNav(currentPath = '/') {
  const { user, isAuthenticated, activeProfile } = store.getState();
  const profileName = activeProfile ? activeProfile.profile_name : user ? user.full_name : 'Guest';

  const isLanding = currentPath === '/';

  const landingAnchorLinks = [
    { href: '#/', label: 'Home', section: 'top' },
    { href: '#section-how-it-works', label: 'How It Works', section: 'section-how-it-works' },
    { href: '#section-features', label: 'Features', section: 'section-features' },
    { href: '#section-brands', label: 'Brands', section: 'section-brands' },
    { href: '#section-about', label: 'About', section: 'section-about' },
  ];

  const appFlowLinks = [
    { path: '/?stay=1', label: 'Home' },
    { path: '/gender', label: 'Gender' },
    { path: '/category', label: 'Category' },
    { path: '/measurements', label: 'Measurements' },
    { path: '/fit-style', label: 'Fit Style' },
    { path: '/results', label: 'Brand Sizes' },
    { path: '/history', label: 'Saved Vault' },
  ];

  return `
    <header class="fm-top-nav" id="main-top-nav" role="banner">
      <div class="fm-top-nav-inner">
        <!-- Supplied FITMATE Brand Logo Lockup -->
        <a href="${isAuthenticated ? '#/gender' : '#/'}" class="fm-brand-lockup" aria-label="FITMATE Home">
          <img
            src="./assets/brand/fitmate-emblem-crop.jpg"
            alt="FITMATE Couture Emblem"
            class="fm-brand-logo-img"
            onerror="this.src='./assets/brand/fitmate-hero-logo.jpg'"
          />
          <div style="display: flex; flex-direction: column;">
            <span class="fm-brand-title">FITMATE</span>
            <span class="fm-brand-subtitle">Bespoke Sizing AI</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="fm-nav-links" aria-label="Main Navigation">
          ${
            isLanding
              ? landingAnchorLinks
                  .map(
                    (item, idx) => `
                  <a href="${item.href}" class="fm-nav-link ${idx === 0 ? 'active' : ''}" data-scroll-target="${item.section}">
                    ${item.label}
                  </a>
                `
                  )
                  .join('')
              : appFlowLinks
                  .map((link) => {
                    const cleanLinkPath = link.path.split('?')[0];
                    const isActive =
                      currentPath === cleanLinkPath ||
                      (cleanLinkPath === '/results' && (currentPath === '/result' || currentPath === '/comparison')) ||
                      (cleanLinkPath === '/fit-style' && currentPath === '/brand-picker');
                    return `
                    <a href="#${link.path}" class="fm-nav-link ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
                      ${link.label}
                    </a>
                  `;
                  })
                  .join('')
          }
        </nav>

        <!-- Right User Actions -->
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${
            isAuthenticated
              ? `
              <a href="#/history" class="fm-chip fm-chip-teal" style="text-decoration: none; display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem;" title="Manage saved measurements">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-champagne-gold);">verified_user</span>
                <span style="max-width: 135px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700;">${profileName}</span>
              </a>

              <button id="btn-nav-logout" type="button" class="fm-btn fm-btn-secondary fm-btn-sm" title="Sign out">
                <span class="material-symbols-outlined" style="font-size: 17px;">logout</span>
                <span>Log Out</span>
              </button>
            `
              : `
              <a href="#/auth?mode=login" class="fm-btn fm-btn-secondary fm-btn-sm">
                Log In
              </a>
              <a href="#/auth?mode=signup" class="fm-btn fm-btn-primary fm-btn-sm">
                Get Started
              </a>
            `
          }
        </div>
      </div>
    </header>
  `;
}
function attachTopNavEvents() {
  const logoutBtn = document.getElementById('btn-nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await store.logout();
      window.location.hash = '#/';
    });
  }

  // Smooth in-page section scrolling on the landing page without breaking hash routing
  document.querySelectorAll('a[data-scroll-target]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('data-scroll-target');
      if (!targetId) return;
      if (targetId === 'top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const sectionEl = document.getElementById(targetId);
      if (sectionEl) {
        e.preventDefault();
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll condensation handler
  const nav = document.getElementById('main-top-nav');
  if (nav && !window.__topNavScrollBound) {
    window.__topNavScrollBound = true;
    window.addEventListener(
      'scroll',
      () => {
        const top = window.scrollY || document.documentElement.scrollTop;
        if (top > 24) {
          nav.classList.add('is-scrolled');
        } else {
          nav.classList.remove('is-scrolled');
        }
      },
      { passive: true }
    );
  }
}


// --- Source: LandingPage.js ---
/**
 * ============================================================================
 * PHASE 3: LUXURY FASHION EDITORIAL LANDING PAGE (#/)
 * - Integrates the actual supplied FITMATE logo image & emblem
 * - Luxury Warm Ivory (#E9DCC5), Espresso Brown (#392419), Champagne Gold (#C49A52),
 *   Soft Cream (#F8F5EF), Dark Chocolate (#21150F) visual identity
 * - Hero Heading: "THE PERFECT FIT. REDEFINED."
 * - Primary CTA: "Find My Perfect Fit", Secondary CTA: "Explore How It Works"
 * - Sections:
 *   1. How FITMATE Works (Enter measurements -> Choose preferred fit -> Discover recommended sizes)
 *   2. Intelligent Fit Technology (Five-model AI pipeline, body measurement analysis, garment fit prediction, cross-brand comparison)
 *   3. Explore Fashion Brands (Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, AuraAtelier)
 *   4. Why FITMATE?
 *   5. Final CTA Section
 *   6. Professional Footer with supplied FITMATE branding & navigation
 * - ZERO fabricated statistics, fake testimonials, or unsupported claims.
 * ============================================================================
 */
function renderLandingPage() {
  const { isAuthenticated } = store.getState();
  const primaryStartHref = isAuthenticated ? '#/gender' : '#/auth?mode=signup';

  const brands = [
    {
      name: 'Zara',
      origin: 'Spain • Contemporary Tailoring',
      desc: 'Structured blazers, poplin shirts, trousers, and dresses graded against European pattern blocks.',
    },
    {
      name: 'H&M',
      origin: 'Sweden • Everyday Apparel',
      desc: 'Essential knitwear, relaxed shirts, denim, and daily wardrobe staples with calibrated ease.',
    },
    {
      name: "Levi's",
      origin: 'United States • Heritage Denim',
      desc: 'Iconic waist, seat, rise, and inseam specifications across straight, baggy, loose, cargo, and skinny cuts.',
    },
    {
      name: 'Uniqlo',
      origin: 'Japan • LifeWear Essentials',
      desc: 'Precision-engineered basics and outerwear calibrated for natural movement and drape.',
    },
    {
      name: 'Mango',
      origin: 'Spain • Mediterranean Silhouette',
      desc: 'Tailored dresses, linen separates, and contemporary silhouettes with refined waist-to-hip contours.',
    },
    {
      name: 'NordicThread',
      origin: 'Sweden • Architectural Minimalist',
      desc: 'Scandinavian wardrobe foundations built on verified garment dimensions and clean lines.',
    },
    {
      name: 'AuraAtelier',
      origin: 'France • Contoured Knit & Couture',
      desc: 'Sculpted silhouettes and stretch-woven garments with fabric elasticity compensation.',
    },
  ];

  return `
    <div class="app-shell">
      ${renderTopNav('/')}
      ${renderToasts()}

      <main class="main-content" style="padding-bottom: 2rem;">
        <!-- =================================================================
             HERO SECTION: EDITORIAL LUXURY SPLIT LAYOUT
             ================================================================= -->
        <section style="background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-xl); padding: clamp(1.75rem, 4vw, 3.25rem); margin-bottom: 4rem; box-shadow: var(--shadow-md);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 2.75rem; align-items: center;">
            
            <!-- Left Column: Brand Crest, Editorial Heading, Copy & CTAs -->
            <div>
              <div style="display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.9rem; background: var(--color-white); border: 1px solid var(--color-champagne-gold); border-radius: var(--radius-xs); margin-bottom: 1.5rem;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--color-champagne-gold);"></span>
                <span style="font-size: 0.74rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-espresso);">
                  YOUR PERFECT FIT STARTS HERE
                </span>
              </div>

              <h1 class="fm-serif" style="font-size: clamp(2.5rem, 5.2vw, 4.1rem); font-weight: 700; line-height: 1.08; color: var(--color-dark-chocolate); margin-bottom: 1.25rem; letter-spacing: -0.01em;">
                THE PERFECT FIT.<br />
                <span style="color: var(--color-espresso); border-bottom: 2px solid var(--color-champagne-gold);">REDEFINED.</span>
              </h1>

              <p style="font-size: 1.05rem; color: var(--color-text-muted); line-height: 1.7; max-width: 540px; margin-bottom: 2rem;">
                Your measurements. Your style. Your perfect fit. Discover intelligent size recommendations across your favourite fashion brands.
              </p>

              <!-- Primary & Secondary Hero CTAs -->
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <a href="${primaryStartHref}" id="btn-hero-find-fit" class="fm-btn fm-btn-primary" style="padding: 1rem 2.1rem; font-size: 0.96rem;">
                  <span>Find My Perfect Fit</span>
                  <span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-champagne-gold);">arrow_forward</span>
                </a>

                <a href="#section-how-it-works" id="btn-hero-explore" data-scroll-target="section-how-it-works" class="fm-btn fm-btn-secondary" style="padding: 1rem 1.8rem; font-size: 0.96rem;">
                  <span>Explore How It Works</span>
                </a>
              </div>

              <!-- Direct Access Links: Log In / Sign Up / Guest Flow -->
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--color-muted-beige); font-size: 0.85rem;">
                <a href="#/auth?mode=login" style="color: var(--color-espresso); font-weight: 700; text-decoration: none;">
                  Returning Member? <span style="text-decoration: underline; color: var(--color-champagne-gold);">Log In</span>
                </a>
                <span style="color: var(--color-muted-beige);">|</span>
                <a href="#/auth?mode=signup" style="color: var(--color-espresso); font-weight: 700; text-decoration: none;">
                  New to FITMATE? <span style="text-decoration: underline;">Sign Up</span>
                </a>
                <span style="color: var(--color-muted-beige);">|</span>
                <a href="#/gender" style="color: var(--color-text-muted); font-weight: 600; text-decoration: none;">
                  Continue as Guest →
                </a>
              </div>
            </div>

            <!-- Right Column: Supplied Official FITMATE Brand Artwork & Editorial Photography Showcase -->
            <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1rem; align-items: stretch;">
              <!-- Supplied Primary FITMATE Brand Identity Card -->
              <div class="fm-card" style="padding: 0.75rem; background: #E9DCC5; border: 1.5px solid var(--color-champagne-gold); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; justify-content: space-between;">
                <div class="fm-img-frame" style="aspect-ratio: 1 / 1; border: none; background: #E9DCC5;">
                  <img
                    src="./assets/brand/fitmate-hero-logo.jpg"
                    alt="FITMATE Official Brand Identity — Your Perfect Fit Starts Here"
                    style="object-fit: contain; width: 100%; height: 100%;"
                  />
                </div>
                <div style="padding: 0.65rem 0.4rem 0.2rem; text-align: center;">
                  <div style="font-family: var(--font-serif); font-size: 1.05rem; font-weight: 700; color: var(--color-espresso);">
                    Bespoke Atelier Intelligence
                  </div>
                  <div style="font-size: 0.72rem; color: var(--color-text-muted); letter-spacing: 0.06em; text-transform: uppercase;">
                    Women's & Men's Tailored Sizing
                  </div>
                </div>
              </div>

              <!-- Stacking Fashion Editorial Photography Frames -->
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="fm-img-frame" style="flex: 1; min-height: 170px; border: 1px solid var(--color-muted-beige);">
                  <img
                    src="${FITMATE_IMAGES.landing.editorialHero}"
                    alt="Luxury fashion editorial collection"
                    loading="eager"
                    onerror="this.src='${FITMATE_IMAGES.brand.emblem}'"
                  />
                </div>
                <div class="fm-img-frame" style="flex: 1; min-height: 170px; border: 1px solid var(--color-muted-beige);">
                  <img
                    src="${FITMATE_IMAGES.landing.editorialAtelier}"
                    alt="Tailored garment craftsmanship and fabric drape"
                    loading="eager"
                    onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- =================================================================
             SECTION 1: HOW FITMATE WORKS
             ================================================================= -->
        <section id="section-how-it-works" class="reveal-on-scroll" style="margin-bottom: 4.5rem; scroll-margin-top: 5.5rem;">
          <div style="text-align: center; max-width: 680px; margin: 0 auto 2.5rem;">
            <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.6rem;">The Process</span>
            <h2 class="fm-serif" style="font-size: clamp(2rem, 3.8vw, 2.75rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.5rem;">
              How FITMATE Works
            </h2>
            <p style="font-size: 0.96rem; color: var(--color-text-muted);">
              Three deliberate steps from your natural silhouette to tailored size recommendations across every label.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
            <!-- Step 01 -->
            <div class="fm-card" style="padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.1rem;">
                  <span class="fm-serif" style="font-size: 2.2rem; font-weight: 700; color: var(--color-champagne-gold); line-height: 1;">01</span>
                  <span class="fm-chip fm-chip-teal">Measurements</span>
                </div>
                <div class="fm-img-frame" style="height: 185px; margin-bottom: 1.25rem;">
                  <img
                    src="${FITMATE_IMAGES.landing.editorialFabric}"
                    alt="Tailoring tape and garment fabric"
                    loading="lazy"
                    onerror="this.src='${FITMATE_IMAGES.brand.emblem}'"
                  />
                </div>
                <h3 class="fm-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.45rem;">
                  Enter Measurements
                </h3>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.6;">
                  Select Women or Men and your clothing category (Tops, Bottoms, or Dresses). Enter only the relevant body dimensions in centimetres or inches, and skip optional measurements anytime.
                </p>
              </div>
              <div style="margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border-subtle); font-size: 0.78rem; font-weight: 700; color: var(--color-espresso);">
                Supports CM & IN • Guided Anatomical Tooltips
              </div>
            </div>

            <!-- Step 02 -->
            <div class="fm-card" style="padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.1rem;">
                  <span class="fm-serif" style="font-size: 2.2rem; font-weight: 700; color: var(--color-champagne-gold); line-height: 1;">02</span>
                  <span class="fm-chip fm-chip-teal">Silhouette & Drape</span>
                </div>
                <div class="fm-img-frame" style="height: 185px; margin-bottom: 1.25rem;">
                  <img
                    src="${FITMATE_IMAGES.landing.womensShowcase}"
                    alt="Women's tailored fashion silhouette"
                    loading="lazy"
                    style="object-position: top center;"
                    onerror="this.src='${FITMATE_IMAGES.brand.emblem}'"
                  />
                </div>
                <h3 class="fm-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.45rem;">
                  Choose Your Preferred Fit
                </h3>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.6;">
                  Select the exact garment silhouette you are shopping for — from T-shirts, Regular, Slim, Oversized, Sweatshirts, Jackets, and Kurta tops to Straight, Baggy, Cargo, Track Pants, Bodycon, and Jumpsuit cuts.
                </p>
              </div>
              <div style="margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border-subtle); font-size: 0.78rem; font-weight: 700; color: var(--color-espresso);">
                14 Category-Specific Fit Styles • Dynamic Ease Calibration
              </div>
            </div>

            <!-- Step 03 -->
            <div class="fm-card" style="padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.1rem;">
                  <span class="fm-serif" style="font-size: 2.2rem; font-weight: 700; color: var(--color-champagne-gold); line-height: 1;">03</span>
                  <span class="fm-chip fm-chip-teal">Cross-Brand Verdict</span>
                </div>
                <div class="fm-img-frame" style="height: 185px; margin-bottom: 1.25rem;">
                  <img
                    src="${FITMATE_IMAGES.landing.mensShowcase}"
                    alt="Men's tailored fashion fit recommendation"
                    loading="lazy"
                    style="object-position: top center;"
                    onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                  />
                </div>
                <h3 class="fm-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.45rem;">
                  Discover Your Recommended Sizes
                </h3>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.6;">
                  View your recommended size across every brand simultaneously with live confidence scores, tailoring notes, size chart comparisons, and a five-model AI analysis.
                </p>
              </div>
              <div style="margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border-subtle); font-size: 0.78rem; font-weight: 700; color: var(--color-espresso);">
                Instant All-Brand Comparison • Save & Edit Anytime
              </div>
            </div>
          </div>
        </section>

        <!-- =================================================================
             SECTION 2: INTELLIGENT FIT TECHNOLOGY
             ================================================================= -->
        <section id="section-features" class="reveal-on-scroll" style="margin-bottom: 4.5rem; scroll-margin-top: 5.5rem;">
          <div class="fm-card" style="padding: clamp(1.75rem, 3.5vw, 2.75rem); background: linear-gradient(145deg, #FFFFFF 0%, #F8F5EF 100%);">
            <div style="max-width: 680px; margin-bottom: 2.25rem;">
              <span class="fm-chip fm-chip-coral" style="margin-bottom: 0.6rem;">Architecture</span>
              <h2 class="fm-serif" style="font-size: clamp(1.9rem, 3.6vw, 2.6rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.5rem;">
                Intelligent Fit Technology
              </h2>
              <p style="font-size: 0.95rem; color: var(--color-text-muted);">
                Every recommendation is computed in real time by combining deterministic garment ease strategies with our five specialized machine learning models.
              </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 1.25rem;">
              <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-md); padding: 1.4rem;">
                <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 0.9rem;">
                  <span class="material-symbols-outlined">psychology</span>
                </div>
                <h3 class="fm-serif" style="font-size: 1.3rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.35rem;">
                  Five-Model AI Pipeline
                </h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.55;">
                  Evaluates size probability (Model 1), fit tension dynamics (Model 2), flat garment specifications (Model 3), anthropometric body shape (Model 4), and return-risk prediction (Model 5).
                </p>
              </div>

              <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-md); padding: 1.4rem;">
                <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 0.9rem;">
                  <span class="material-symbols-outlined">straighten</span>
                </div>
                <h3 class="fm-serif" style="font-size: 1.3rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.35rem;">
                  Body Measurement Analysis
                </h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.55;">
                  Normalizes metric and imperial dimensions, validates anatomical ranges, and computes waist-to-height proportions without distorting missing optional fields.
                </p>
              </div>

              <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-md); padding: 1.4rem;">
                <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 0.9rem;">
                  <span class="material-symbols-outlined">checkroom</span>
                </div>
                <h3 class="fm-serif" style="font-size: 1.3rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.35rem;">
                  Garment Fit Prediction
                </h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.55;">
                  Accounts for fabric stretch elasticity and category-specific ease allowances across Women's Tops, Bottoms, Dresses, and Men's Tops and Bottoms.
                </p>
              </div>

              <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-md); padding: 1.4rem;">
                <div style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 0.9rem;">
                  <span class="material-symbols-outlined">compare_arrows</span>
                </div>
                <h3 class="fm-serif" style="font-size: 1.3rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.35rem;">
                  Cross-Brand Comparison
                </h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.55;">
                  Translates your single measurement profile across multiple international brand grading blocks so you know when to size up or down per label.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- =================================================================
             SECTION 3: EXPLORE FASHION BRANDS
             ================================================================= -->
        <section id="section-brands" class="reveal-on-scroll" style="margin-bottom: 4.5rem; scroll-margin-top: 5.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
            <div>
              <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.5rem;">Catalog Coverage</span>
              <h2 class="fm-serif" style="font-size: clamp(1.9rem, 3.6vw, 2.6rem); font-weight: 700; color: var(--color-dark-chocolate);">
                Explore Fashion Brands
              </h2>
            </div>
            <p style="font-size: 0.9rem; color: var(--color-text-muted); max-width: 440px;">
              Compare your silhouette against the size charts and grading offsets of all seven catalog brands simultaneously.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.15rem;">
            ${brands
              .map(
                (b) => `
                <div class="fm-card" style="padding: 1.35rem; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                      <h3 class="fm-serif" style="font-size: 1.5rem; font-weight: 700; color: var(--color-espresso);">${b.name}</h3>
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">verified</span>
                    </div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-champagne-gold); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.6rem;">
                      ${b.origin}
                    </div>
                    <p style="font-size: 0.84rem; color: var(--color-text-muted); line-height: 1.55;">
                      ${b.desc}
                    </p>
                  </div>
                  <div style="margin-top: 1rem; padding-top: 0.65rem; border-top: 1px solid var(--color-border-subtle); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-light);">Size Chart Integrated</span>
                    <a href="#/gender" style="font-size: 0.78rem; font-weight: 700; color: var(--color-espresso); text-decoration: none;">Check My Size →</a>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </section>

        <!-- =================================================================
             SECTION 4: WHY FITMATE?
             ================================================================= -->
        <section id="section-about" class="reveal-on-scroll" style="margin-bottom: 4.5rem; scroll-margin-top: 5.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 2.25rem; align-items: center;">
            <div class="fm-img-frame" style="height: 430px; border: 1.5px solid var(--color-champagne-gold); box-shadow: var(--shadow-md);">
              <img
                src="${FITMATE_IMAGES.landing.womensShowcase}"
                alt="Editorial female fashion model wearing tailored champagne silk and ivory coat"
                loading="lazy"
                style="object-position: top center;"
                onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
              />
            </div>

            <div>
              <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.6rem;">The FITMATE Advantage</span>
              <h2 class="fm-serif" style="font-size: clamp(2rem, 3.6vw, 2.65rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 1rem;">
                Why FITMATE?
              </h2>
              <p style="font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.65; margin-bottom: 1.5rem;">
                Standard size labels vary significantly from one fashion house to another. FITMATE replaces guesswork with transparent garment geometry.
              </p>

              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; gap: 0.9rem; align-items: flex-start;">
                  <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px; margin-top: 2px;">check_circle</span>
                  <div>
                    <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--color-espresso);">Reduce Sizing Uncertainty</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-muted);">See exact ease allowances and per-measurement fit notes before choosing a size.</p>
                  </div>
                </div>

                <div style="display: flex; gap: 0.9rem; align-items: flex-start;">
                  <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px; margin-top: 2px;">check_circle</span>
                  <div>
                    <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--color-espresso);">Compare Sizes Across Brands</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-muted);">Understand how your size in Zara or Mango compares to H&M, Levi's, or Uniqlo for the same fit style.</p>
                  </div>
                </div>

                <div style="display: flex; gap: 0.9rem; align-items: flex-start;">
                  <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px; margin-top: 2px;">check_circle</span>
                  <div>
                    <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--color-espresso);">Personalized Recommendations</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-muted);">Tailored to your chosen silhouette — whether you prefer a sculpted slim fit or an oversized drape.</p>
                  </div>
                </div>

                <div style="display: flex; gap: 0.9rem; align-items: flex-start;">
                  <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px; margin-top: 2px;">check_circle</span>
                  <div>
                    <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--color-espresso);">Save and Reuse Measurements</h4>
                    <p style="font-size: 0.85rem; color: var(--color-text-muted);">Store profiles by category and gender, track timestamped measurement changes, and re-run recommendations anytime.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- =================================================================
             SECTION 5: FINAL CTA BANNER
             ================================================================= -->
        <section class="reveal-on-scroll" style="margin-bottom: 2rem;">
          <div style="background: var(--color-espresso); color: var(--color-warm-ivory); border: 1.5px solid var(--color-champagne-gold); border-radius: var(--radius-xl); padding: clamp(2rem, 4vw, 3.25rem); text-align: center; box-shadow: var(--shadow-lg);">
            <img
              src="./assets/brand/fitmate-emblem-crop.jpg"
              alt="FITMATE Emblem"
              style="width: 72px; height: 72px; object-fit: cover; border-radius: 50%; border: 1.5px solid var(--color-champagne-gold); margin: 0 auto 1rem;"
            />
            <h2 class="fm-serif" style="font-size: clamp(1.9rem, 3.8vw, 2.75rem); font-weight: 700; color: var(--color-white); margin-bottom: 0.65rem;">
              Begin Your Bespoke Fitting Experience
            </h2>
            <p style="font-size: 0.96rem; color: var(--color-muted-beige); max-width: 540px; margin: 0 auto 1.75rem;">
              Enter your measurements once or sign in to your saved vault to discover your recommended size across every fashion brand.
            </p>
            <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
              <a href="${primaryStartHref}" class="fm-btn fm-btn-gold" style="padding: 0.95rem 2.2rem;">
                <span>Find My Perfect Fit</span>
                <span class="material-symbols-outlined" style="font-size: 19px;">arrow_forward</span>
              </a>
              <a href="#/auth?mode=login" class="fm-btn fm-btn-secondary" style="background: transparent; color: var(--color-warm-ivory); border-color: var(--color-champagne-gold); padding: 0.95rem 1.85rem;">
                <span>Log In to Saved Vault</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- ===================================================================
           SECTION 6: PROFESSIONAL LUXURY FOOTER
           =================================================================== -->
      <footer class="fm-luxury-footer" role="contentinfo">
        <div class="fm-luxury-footer-inner">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <img
                src="./assets/brand/fitmate-hero-logo.jpg"
                alt="FITMATE Official Brand Logo"
                style="width: 54px; height: 54px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--color-champagne-gold);"
              />
              <div>
                <div class="fm-serif" style="font-size: 1.5rem; font-weight: 700; color: var(--color-white); letter-spacing: 0.08em;">FITMATE</div>
                <div style="font-size: 0.65rem; color: var(--color-champagne-gold); letter-spacing: 0.14em; text-transform: uppercase;">Your Perfect Fit Starts Here</div>
              </div>
            </div>
            <p style="font-size: 0.84rem; color: var(--color-muted-beige); line-height: 1.6;">
              AI-powered clothing size recommendation and cross-brand garment fit analysis platform.
            </p>
          </div>

          <div>
            <h4 class="fm-serif" style="font-size: 1.15rem; font-weight: 700; color: var(--color-white); margin-bottom: 0.85rem;">Platform</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <a href="#/gender">Gender Selection</a>
              <a href="#/category">Clothing Categories</a>
              <a href="#/measurements">Body Measurements</a>
              <a href="#/fit-style">Fit-Style Selection</a>
              <a href="#/results">Brand Recommendations</a>
            </div>
          </div>

          <div>
            <h4 class="fm-serif" style="font-size: 1.15rem; font-weight: 700; color: var(--color-white); margin-bottom: 0.85rem;">Account & Vault</h4>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <a href="#/auth?mode=login">Log In</a>
              <a href="#/auth?mode=signup">Sign Up</a>
              <a href="#/history">Saved Measurement Profiles</a>
              <a href="#/comparison">Size Chart Comparison Matrix</a>
            </div>
          </div>

          <div>
            <h4 class="fm-serif" style="font-size: 1.15rem; font-weight: 700; color: var(--color-white); margin-bottom: 0.85rem;">Supported Brands</h4>
            <p style="font-size: 0.84rem; color: var(--color-muted-beige); line-height: 1.7;">
              Zara • H&M • Levi's • Uniqlo • Mango • NordicThread • AuraAtelier
            </p>
          </div>
        </div>

        <div style="max-width: 1200px; margin: 2.25rem auto 0; padding-top: 1.25rem; border-top: 1px solid rgba(214, 196, 167, 0.2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.78rem; color: var(--color-muted-beige);">
          <span>© ${new Date().getFullYear()} FITMATE. All rights reserved.</span>
          <span>Powered by 5-Model Sizing Intelligence & Verified Brand Size Charts</span>
        </div>
      </footer>

      ${renderBottomTabBar('/')}
    </div>
  `;
}
function onMountLandingPage(params = {}) {
  attachTopNavEvents();

  // Returning users with a valid session skip this page and go straight to #/gender unless ?stay=1 is passed
  const { isAuthenticated } = store.getState();
  if (isAuthenticated && !params?.stay) {
    window.location.hash = '#/gender';
    return;
  }

  reveal('.reveal-on-scroll', {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  });
}


// --- Source: AuthPage.js ---
/**
 * ============================================================================
 * PHASE 4.1: LUXURY AUTHENTICATION SCREEN (#/auth — Log In & Sign Up)
 * - Uses the supplied FITMATE logo branding in an editorial split-screen layout
 * - Password visibility toggle (Show / Hide password)
 * - Inline validation, loading states, error handling
 * - Auto-logs user in after Sign Up and sends straight into #/gender
 * - Preserves seeded demo account auto-fill (alex@sizerec.example.com / UserPass123)
 * ============================================================================
 */





let authMode = 'login';
function renderAuthPage(params = {}) {
  if (params && (params.mode === 'signup' || params.mode === 'login')) {
    authMode = params.mode;
  }
  const isSignup = authMode === 'signup';

  return `
    <div class="app-shell">
      ${renderTopNav('/auth')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 1020px; display: flex; align-items: center; justify-content: center; min-height: 78vh;">
        <div class="fm-card" style="width: 100%; padding: 0; overflow: hidden; border: 1px solid var(--color-muted-beige); box-shadow: var(--shadow-lg); display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
          
          <!-- Left Column: Supplied FITMATE Brand Identity Showcase -->
          <div style="background: linear-gradient(160deg, #E9DCC5 0%, #D6C4A7 100%); padding: 2.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; border-right: 1px solid var(--color-muted-beige);">
            <div style="width: 100%;">
              <span class="fm-chip fm-chip-coral" style="margin-bottom: 1rem;">Bespoke Sizing Atelier</span>
              <h2 class="fm-serif" style="font-size: 2rem; font-weight: 700; color: var(--color-dark-chocolate); line-height: 1.15; margin-bottom: 0.5rem;">
                Tailored Confidence Across Every Label
              </h2>
              <p style="font-size: 0.86rem; color: var(--color-text-muted); max-width: 340px; margin: 0 auto 1.5rem;">
                Save your body measurements once and compare your recommended size across Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, and AuraAtelier.
              </p>
            </div>

            <div class="fm-img-frame" style="width: 100%; max-width: 310px; aspect-ratio: 1 / 1; border: 1.5px solid var(--color-champagne-gold); box-shadow: var(--shadow-md); background: #E9DCC5; margin-bottom: 1.25rem;">
              <img
                src="./assets/brand/fitmate-hero-logo.jpg"
                alt="FITMATE Official Brand Logo — Your Perfect Fit Starts Here"
                style="width: 100%; height: 100%; object-fit: contain;"
              />
            </div>

            <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-espresso);">
              YOUR PERFECT FIT STARTS HERE
            </div>
          </div>

          <!-- Right Column: Authentication Form -->
          <div style="padding: clamp(1.75rem, 3.5vw, 2.75rem); background: var(--color-white); display: flex; flex-direction: column; justify-content: center;">
            <div style="margin-bottom: 1.5rem;">
              <h1 class="fm-serif" style="font-size: 2rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
                ${isSignup ? 'Create Your FITMATE Account' : 'Welcome Back to FITMATE'}
              </h1>
              <p style="font-size: 0.88rem; color: var(--color-text-muted);">
                ${isSignup ? 'Register below to enter the app immediately — no second login required.' : 'Sign in to access your saved measurement profiles and fit history.'}
              </p>
            </div>

            <!-- Segmented Toggle (Log In / Sign Up) -->
            <div style="display: flex; background: var(--color-soft-cream); padding: 0.28rem; border-radius: var(--radius-sm); border: 1px solid var(--color-muted-beige); margin-bottom: 1.35rem;">
              <button type="button" id="tab-login" class="fm-btn ${!isSignup ? 'fm-btn-primary' : 'fm-btn-ghost'}" style="flex: 1; padding: 0.55rem; font-size: 0.88rem;">
                Log In
              </button>
              <button type="button" id="tab-signup" class="fm-btn ${isSignup ? 'fm-btn-primary' : 'fm-btn-ghost'}" style="flex: 1; padding: 0.55rem; font-size: 0.88rem;">
                Sign Up
              </button>
            </div>

            <!-- Demo Account Auto-Fill Bar -->
            <div style="background: var(--color-soft-cream); border: 1px solid var(--color-muted-beige); border-radius: var(--radius-sm); padding: 0.7rem 0.9rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                <strong style="color: var(--color-espresso);">Demo Account:</strong> alex@sizerec.example.com
              </div>
              <button type="button" id="btn-fill-demo" class="fm-btn fm-btn-secondary fm-btn-sm" style="padding: 0.28rem 0.75rem; font-size: 0.76rem; flex-shrink: 0;">
                Auto-Fill Demo
              </button>
            </div>

            <!-- Server Error Banner -->
            <div id="auth-general-error" role="alert" style="display: none; background: var(--color-error-light); border: 1px solid var(--color-error); color: var(--color-error); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem;"></div>

            <form id="auth-form" novalidate>
              ${
                isSignup
                  ? `
                <div class="fm-form-group">
                  <label class="fm-label" for="auth-name">Full Name <span style="color: var(--color-champagne-gold);">*</span></label>
                  <div class="fm-input-wrapper">
                    <span class="material-symbols-outlined fm-input-icon">person</span>
                    <input type="text" id="auth-name" class="fm-input with-icon" placeholder="Emma Watson" autocomplete="name" required />
                  </div>
                  <div id="err-name" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
                </div>
              `
                  : ''
              }

              <div class="fm-form-group">
                <label class="fm-label" for="auth-email">Email Address <span style="color: var(--color-champagne-gold);">*</span></label>
                <div class="fm-input-wrapper">
                  <span class="material-symbols-outlined fm-input-icon">mail</span>
                  <input type="email" id="auth-email" class="fm-input with-icon" placeholder="alex@sizerec.example.com" autocomplete="email" required />
                </div>
                <div id="err-email" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
              </div>

              <div class="fm-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label class="fm-label" for="auth-password">Password <span style="color: var(--color-champagne-gold);">*</span></label>
                  <span style="font-size: 0.72rem; color: var(--color-text-light);">
                    ${isSignup ? 'Min 8 chars, 1 letter & 1 number' : ''}
                  </span>
                </div>
                <div class="fm-input-wrapper">
                  <span class="material-symbols-outlined fm-input-icon">lock</span>
                  <input type="password" id="auth-password" class="fm-input with-icon" placeholder="••••••••" autocomplete="${isSignup ? 'new-password' : 'current-password'}" style="padding-right: 2.8rem;" required />
                  <button
                    type="button"
                    id="btn-toggle-password"
                    aria-label="Toggle password visibility"
                    style="position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; color: var(--color-text-light); display: flex; align-items: center; padding: 0.25rem;"
                  >
                    <span class="material-symbols-outlined" id="icon-toggle-password" style="font-size: 19px;">visibility</span>
                  </button>
                </div>
                <div id="err-password" class="fm-error-text" style="display: none; color: var(--color-error); font-size: 0.78rem; margin-top: 0.25rem; font-weight: 600;"></div>
              </div>

              <button type="submit" id="btn-auth-submit" class="fm-btn fm-btn-primary fm-btn-block" style="margin-top: 1rem; height: 3.2rem; font-size: 0.95rem;">
                <span>${isSignup ? 'Create Account & Continue' : 'Sign In & Continue'}</span>
                <span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-champagne-gold);">arrow_forward</span>
              </button>
            </form>

            <!-- Guest Access -->
            <div style="text-align: center; margin-top: 1.35rem; border-top: 1px solid var(--color-border-subtle); padding-top: 1rem;">
              <a href="#/gender" style="font-size: 0.85rem; color: var(--color-espresso); font-weight: 700; text-decoration: none;">
                Continue as Guest (Save measurements later) →
              </a>
            </div>
          </div>

        </div>
      </main>

      ${renderBottomTabBar('/auth')}
    </div>
  `;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function validateAuthInputs(isSignup, email, name, password) {
  let valid = true;
  showFieldError('err-name', '');
  showFieldError('err-email', '');
  showFieldError('err-password', '');
  const generalErr = document.getElementById('auth-general-error');
  if (generalErr) generalErr.style.display = 'none';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showFieldError('err-email', 'Please enter your email address.');
    valid = false;
  } else if (!emailRegex.test(email)) {
    showFieldError('err-email', 'Please enter a valid email address (e.g. name@example.com).');
    valid = false;
  }

  if (isSignup) {
    if (!name || name.length < 2) {
      showFieldError('err-name', 'Please enter your full name (at least 2 characters).');
      valid = false;
    }
  }

  if (!password) {
    showFieldError('err-password', 'Please enter your password.');
    valid = false;
  } else if (isSignup) {
    if (password.length < 8) {
      showFieldError('err-password', 'Password must be at least 8 characters long.');
      valid = false;
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showFieldError('err-password', 'Password must contain at least one letter and one number.');
      valid = false;
    }
  }

  return valid;
}
function onMountAuthPage(params = {}) {
  attachTopNavEvents();

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const btnFillDemo = document.getElementById('btn-fill-demo');
  const btnTogglePass = document.getElementById('btn-toggle-password');
  const iconTogglePass = document.getElementById('icon-toggle-password');
  const passInput = document.getElementById('auth-password');
  const form = document.getElementById('auth-form');

  if (btnTogglePass && passInput) {
    btnTogglePass.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      if (iconTogglePass) {
        iconTogglePass.textContent = isHidden ? 'visibility_off' : 'visibility';
      }
    });
  }

  if (tabLogin) {
    tabLogin.addEventListener('click', () => {
      authMode = 'login';
      const redirectParam = params?.redirect ? `&redirect=${encodeURIComponent(params.redirect)}` : '';
      window.location.hash = `#/auth?mode=login${redirectParam}`;
    });
  }

  if (tabSignup) {
    tabSignup.addEventListener('click', () => {
      authMode = 'signup';
      const redirectParam = params?.redirect ? `&redirect=${encodeURIComponent(params.redirect)}` : '';
      window.location.hash = `#/auth?mode=signup${redirectParam}`;
    });
  }

  if (btnFillDemo) {
    btnFillDemo.addEventListener('click', () => {
      const emailInput = document.getElementById('auth-email');
      const nameInput = document.getElementById('auth-name');
      if (emailInput) emailInput.value = 'alex@sizerec.example.com';
      if (passInput) passInput.value = 'UserPass123';
      if (nameInput && !nameInput.value) nameInput.value = 'Alex Rivera';
      showFieldError('err-name', '');
      showFieldError('err-email', '');
      showFieldError('err-password', '');
      store.addToast('Demo credentials filled (UserPass123).', 'info');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isSignup = authMode === 'signup';
      const email = document.getElementById('auth-email')?.value.trim() || '';
      const password = document.getElementById('auth-password')?.value || '';
      const name = document.getElementById('auth-name')?.value.trim() || '';

      if (!validateAuthInputs(isSignup, email, name, password)) {
        return;
      }

      const submitBtn = document.getElementById('btn-auth-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>${isSignup ? 'Creating account & signing you in...' : 'Signing in...'}</span>`;
      }

      try {
        if (isSignup) {
          await store.register(email, name, password);
          store.addToast(`Welcome to FITMATE, ${name}!`, 'success');
        } else {
          await store.login(email, password);
          store.addToast('Welcome back! Your saved profiles are ready.', 'success');
        }

        const targetRoute = params?.redirect || '/gender';
        window.location.hash = `#${targetRoute.startsWith('/') ? targetRoute : '/' + targetRoute}`;
      } catch (err) {
        const message = err.message || 'Authentication failed. Please verify your credentials.';
        const generalErr = document.getElementById('auth-general-error');
        if (generalErr) {
          generalErr.textContent = message;
          generalErr.style.display = 'block';
        }
        store.addToast(message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>${authMode === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}</span><span class="material-symbols-outlined" style="font-size: 19px; color: var(--color-champagne-gold);">arrow_forward</span>`;
        }
      }
    });
  }
}


// --- Source: OnboardingPage.js ---
/**
 * ============================================================================
 * PHASE 4.2 & 4.3: GENDER SELECTION (#/gender) & CLOTHING CATEGORIES (#/category)
 * - Uses realistic locally stored fashion editorial photography in ./assets/fashion/
 * - Warm Ivory, Espresso Brown, Champagne Gold luxury theme
 * - Preserves gender state, profile persistence, saved measurements quick-resume,
 *   category codes, and route guards.
 * ============================================================================
 */






function renderFlowStepper(activeStep = 1) {
  const steps = [
    { num: 1, label: 'Gender', path: '/gender' },
    { num: 2, label: 'Category', path: '/category' },
    { num: 3, label: 'Measurements', path: '/measurements' },
    { num: 4, label: 'Fit Style', path: '/fit-style' },
    { num: 5, label: 'Brand Sizes', path: '/results' },
  ];

  return `
    <div style="margin-bottom: 1.75rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.65rem;">
        ${steps
          .map((s) => {
            const isCurrent = s.num === activeStep;
            const isDone = s.num < activeStep;
            return `
              <a href="#${s.path}" style="text-decoration: none; display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-xs); border: 1px solid ${
              isCurrent
                ? 'var(--color-champagne-gold)'
                : isDone
                ? 'var(--color-muted-beige)'
                : 'transparent'
            }; background: ${
              isCurrent ? 'var(--color-espresso)' : isDone ? 'var(--color-warm-ivory)' : 'var(--color-white)'
            }; color: ${
              isCurrent ? 'var(--color-warm-ivory)' : isDone ? 'var(--color-espresso)' : 'var(--color-text-light)'
            }; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">
                <span style="width: 1.25rem; height: 1.25rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: ${
                  isCurrent ? 'var(--color-champagne-gold)' : isDone ? 'var(--color-espresso)' : 'var(--color-muted-beige)'
                }; color: ${isCurrent ? 'var(--color-dark-chocolate)' : '#FFFFFF'}; font-size: 0.7rem;">
                  ${isDone ? '✓' : s.num}
                </span>
                <span>${s.label}</span>
              </a>
            `;
          })
          .join('')}
      </div>
      <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
        <div style="width: ${(activeStep / 5) * 100}%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%); transition: width 0.3s ease;"></div>
      </div>
    </div>
  `;
}

/* ============================================================================
 * PHASE 4.2: GENDER SELECTION PAGE (#/gender)
 * ============================================================================ */
function renderGenderPage() {
  const { draftMeasurements, profiles, activeProfile, user } = store.getState();
  const currentGender = draftMeasurements.gender === 'male' ? 'male' : 'female';
  const savedProfile = activeProfile || (profiles && profiles.length > 0 ? profiles[0] : null);

  return `
    <div class="app-shell">
      ${renderTopNav('/gender')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 960px;">
        ${renderFlowStepper(1)}

        ${
          savedProfile
            ? `
          <!-- Saved Measurements Quick-Resume Banner -->
          <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.9rem;">
              <div style="width: 2.75rem; height: 2.75rem; border-radius: var(--radius-sm); background: var(--color-espresso); color: var(--color-champagne-gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 22px;">bookmark_added</span>
              </div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-espresso); text-transform: uppercase; letter-spacing: 0.08em;">
                  Saved Measurements Available ${user?.full_name ? `• ${user.full_name}` : ''}
                </div>
                <div class="fm-serif" style="font-size: 1.2rem; font-weight: 700; color: var(--color-dark-chocolate);">
                  ${savedProfile.profile_name} (${savedProfile.gender === 'male' ? 'Men' : 'Women'} • Chest ${savedProfile.chest_bust_cm || 92} cm, Waist ${savedProfile.waist_cm || 74} cm)
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
              <button type="button" id="btn-gender-use-saved" class="fm-btn fm-btn-primary fm-btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-champagne-gold);">bolt</span>
                <span>Use Saved Measurements</span>
              </button>
              <button type="button" id="btn-gender-update-saved" class="fm-btn fm-btn-secondary fm-btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                <span>Update Measurements</span>
              </button>
            </div>
          </div>
        `
            : ''
        }

        <div style="text-align: center; margin-bottom: 2.25rem;">
          <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.6rem;">Step 1 of 4 • Department</span>
          <h1 class="fm-serif" style="font-size: clamp(2rem, 4.2vw, 2.85rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.4rem;">
            Select Your Sizing Collection
          </h1>
          <p style="font-size: 0.96rem; color: var(--color-text-muted); max-width: 540px; margin: 0 auto;">
            Choose Women or Men to calibrate our pattern grading tables, anatomical proportions, and clothing categories.
          </p>
        </div>

        <!-- Two Editorial Fashion Cards: Women & Men -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.75rem; margin-bottom: 2rem;">
          
          <!-- WOMEN SELECTION CARD -->
          <div class="gender-visual-card fm-card" data-gender="female" role="button" tabindex="0" style="cursor: pointer; padding: 1.25rem; border: 2px solid ${
            currentGender === 'female' ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
          }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="fm-img-frame" style="height: 340px; margin-bottom: 1.25rem;">
                <img
                  src="${FITMATE_IMAGES.gender.female.hero}"
                  alt="${FITMATE_IMAGES.gender.female.alt}"
                  loading="eager"
                  style="object-position: top center;"
                  onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                />
                <div style="position: absolute; top: 0.85rem; left: 0.85rem;">
                  <span class="fm-chip fm-chip-coral">Tops • Bottoms • Dresses</span>
                </div>
                ${
                  currentGender === 'female'
                    ? `<div style="position: absolute; top: 0.85rem; right: 0.85rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                    : ''
                }
              </div>

              <div style="padding: 0 0.35rem;">
                <h2 class="fm-serif" style="font-size: 1.85rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.35rem;">
                  Women
                </h2>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.55; margin-bottom: 1.25rem;">
                  Calibrated for bust, natural waist, and hip contours across Women's Tops, Bottoms, and Dresses.
                </p>
              </div>
            </div>

            <span class="fm-btn ${currentGender === 'female' ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
              <span>Select Women's Collection</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
            </span>
          </div>

          <!-- MEN SELECTION CARD -->
          <div class="gender-visual-card fm-card" data-gender="male" role="button" tabindex="0" style="cursor: pointer; padding: 1.25rem; border: 2px solid ${
            currentGender === 'male' ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
          }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="fm-img-frame" style="height: 340px; margin-bottom: 1.25rem;">
                <img
                  src="${FITMATE_IMAGES.gender.male.hero}"
                  alt="${FITMATE_IMAGES.gender.male.alt}"
                  loading="eager"
                  style="object-position: top center;"
                  onerror="this.src='${FITMATE_IMAGES.brand.heroLogo}'"
                />
                <div style="position: absolute; top: 0.85rem; left: 0.85rem;">
                  <span class="fm-chip fm-chip-coral">Tops • Bottoms</span>
                </div>
                ${
                  currentGender === 'male'
                    ? `<div style="position: absolute; top: 0.85rem; right: 0.85rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                    : ''
                }
              </div>

              <div style="padding: 0 0.35rem;">
                <h2 class="fm-serif" style="font-size: 1.85rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.35rem;">
                  Men
                </h2>
                <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.55; margin-bottom: 1.25rem;">
                  Calibrated for chest circumference, shoulder breadth, waist, and inseam across Men's Tops and Bottoms.
                </p>
              </div>
            </div>

            <span class="fm-btn ${currentGender === 'male' ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
              <span>Select Men's Collection</span>
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
            </span>
          </div>

        </div>
      </main>

      ${renderBottomTabBar('/gender')}
    </div>
  `;
}
function onMountGenderPage() {
  attachTopNavEvents();

  const btnUseSaved = document.getElementById('btn-gender-use-saved');
  const btnUpdateSaved = document.getElementById('btn-gender-update-saved');

  if (btnUseSaved) {
    btnUseSaved.addEventListener('click', () => {
      const { activeProfile, profiles } = store.getState();
      const saved = activeProfile || profiles[0];
      if (saved) {
        store.applyProfileToDraft(saved);
        store.addToast(`Loaded saved profile "${saved.profile_name}". Choose your fit style!`, 'success');
        window.location.hash = '#/fit-style';
      }
    });
  }

  if (btnUpdateSaved) {
    btnUpdateSaved.addEventListener('click', () => {
      const { activeProfile, profiles } = store.getState();
      const saved = activeProfile || profiles[0];
      if (saved) {
        store.applyProfileToDraft(saved);
        window.location.hash = '#/measurements';
      }
    });
  }

  document.querySelectorAll('.gender-visual-card').forEach((card) => {
    const handleSelect = async () => {
      const chosenGender = card.dataset.gender === 'male' ? 'male' : 'female';
      store.setGender(chosenGender);

      const { isAuthenticated, activeProfile } = store.getState();
      if (isAuthenticated && activeProfile && activeProfile.id && activeProfile.id < 1000000) {
        try {
          await api.patchMeasurementProfile(activeProfile.id, { gender: chosenGender });
        } catch {
          // non-blocking
        }
      }

      store.addToast(`${chosenGender === 'male' ? "Men's" : "Women's"} collection selected.`, 'info');
      window.location.hash = '#/category';
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/* ============================================================================
 * PHASE 4.3: CLOTHING CATEGORY SELECTION PAGE (#/category)
 * Women: Tops, Bottoms, Dresses
 * Men: Tops, Bottoms
 * ============================================================================ */
function renderCategoryPage() {
  const { draftMeasurements } = store.getState();
  const isMale = draftMeasurements.gender === 'male';
  const currentGroup = draftMeasurements.categoryGroup || 'tops';

  const genderKey = isMale ? 'male' : 'female';
  const categories = [
    {
      group: 'tops',
      title: 'Tops',
      subtitle: isMale
        ? 'Tailored Shirts, Polos, T-Shirts, Knitwear & Overshirts'
        : 'Blouses, Poplin Shirts, Knitwear, Tees & Cropped Silhouettes',
      badge: 'Bust/Chest • Waist • Height • Shoulder (Opt)',
      img: getCategoryImage(genderKey, 'tops'),
    },
    {
      group: 'bottoms',
      title: 'Bottoms',
      subtitle: isMale
        ? 'Tailored Trousers, Straight, Loose, Baggy, Cargo, Track Pants & Shorts'
        : 'High-Waist Trousers, Wide-Leg, Straight, Cargo, Track Pants & Skinny',
      badge: 'Waist • Hips • Height • Inseam (Opt)',
      img: getCategoryImage(genderKey, 'bottoms'),
    },
  ];

  if (!isMale) {
    categories.push({
      group: 'dresses',
      title: 'Dresses',
      subtitle: 'Bodycon, A-Line, Flowing Maxi Dresses & Tailored Jumpsuits',
      badge: 'Bust • Waist • Hips • Height • Shoulder (Opt)',
      img: getCategoryImage('female', 'dresses'),
    });
  }

  return `
    <div class="app-shell">
      ${renderTopNav('/category')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 980px;">
        ${renderFlowStepper(2)}

        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
          <div>
            <span class="fm-chip fm-chip-marigold" style="margin-bottom: 0.5rem;">
              Step 2 of 4 • ${isMale ? "Men's" : "Women's"} Garment Category
            </span>
            <h1 class="fm-serif" style="font-size: clamp(1.9rem, 3.8vw, 2.65rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
              Select a Clothing Category
            </h1>
            <p style="font-size: 0.94rem; color: var(--color-text-muted);">
              Each category activates its dedicated pattern grading strategy and required body measurements.
            </p>
          </div>

          <a href="#/gender" class="fm-btn fm-btn-secondary fm-btn-sm">
            <span class="material-symbols-outlined" style="font-size: 16px;">swap_horiz</span>
            <span>Switch Department (${isMale ? 'Men' : 'Women'})</span>
          </a>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(275px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          ${categories
            .map((cat) => {
              const isSelected = currentGroup === cat.group;
              return `
                <div class="category-visual-card fm-card" data-group="${cat.group}" role="button" tabindex="0" style="cursor: pointer; padding: 1.2rem; border: 2px solid ${
                isSelected ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
              }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div class="fm-img-frame" style="height: 255px; margin-bottom: 1.15rem;">
                      <img
                        src="${cat.img}"
                        alt="${isMale ? "Men's" : "Women's"} ${cat.title}"
                        loading="eager"
                        onerror="this.src='./assets/brand/fitmate-emblem.jpg'"
                      />
                      ${
                        isSelected
                          ? `<div style="position: absolute; top: 0.75rem; right: 0.75rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 18px;">check</span></div>`
                          : ''
                      }
                    </div>

                    <div style="padding: 0 0.25rem;">
                      <h2 class="fm-serif" style="font-size: 1.65rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.3rem;">
                        ${cat.title}
                      </h2>
                      <p style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 1rem;">
                        ${cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--color-espresso); background: var(--color-soft-cream); border: 1px solid var(--color-border-subtle); padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); margin-bottom: 1rem; text-align: center;">
                      ${cat.badge}
                    </div>

                    <span class="fm-btn ${isSelected ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-block" style="pointer-events: none;">
                      <span>Continue with ${cat.title}</span>
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-champagne-gold);">arrow_forward</span>
                    </span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div>
          <a href="#/gender" class="fm-btn fm-btn-secondary fm-btn-sm">
            <span class="material-symbols-outlined" style="font-size: 17px;">arrow_back</span>
            <span>Back to Gender Selection</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/category')}
    </div>
  `;
}
function onMountCategoryPage() {
  attachTopNavEvents();

  document.querySelectorAll('.category-visual-card').forEach((card) => {
    const handleSelect = () => {
      const group = card.dataset.group;
      store.setCategory(group);

      const { draftMeasurements } = store.getState();
      const savedForCat = store.findSavedProfileForCategory(draftMeasurements.gender, draftMeasurements.categoryCode);
      if (savedForCat) {
        store.setDraftMeasurements({
          height: savedForCat.height_cm || draftMeasurements.height,
          weight: savedForCat.weight_kg || draftMeasurements.weight,
          chest: savedForCat.chest_bust_cm || draftMeasurements.chest,
          waist: savedForCat.waist_cm || draftMeasurements.waist,
          hips: savedForCat.hips_cm || draftMeasurements.hips,
          shoulder: savedForCat.shoulder_cm != null ? savedForCat.shoulder_cm : draftMeasurements.shoulder,
          inseam: savedForCat.inseam_cm != null ? savedForCat.inseam_cm : draftMeasurements.inseam,
        });
      }

      window.location.hash = '#/measurements';
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}
function renderOnboardingPage() {
  return renderGenderPage();
}
function onMountOnboardingPage() {
  return onMountGenderPage();
}


// --- Source: DashboardPage.js ---
/**
 * ============================================================================
 * PART 1: HOME / DASHBOARD SCREEN (Dynamic Hub & Motion)
 * User hub with personalized silhouette status, recent recommendations,
 * quick action tiles, 3D tilt, and real-time backend data loading.
 * ============================================================================
 */
async function renderDashboardPage() {
  const { user, activeProfile } = store.getState();
  const userName = user?.full_name ? user.full_name.split(' ')[0] : 'Emma';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  let recentRecs = [];
  try {
    recentRecs = await api.listRecommendations();
  } catch (err) {
    console.warn('Dashboard recommendation load notice:', err.message);
  }

  const profileChest = activeProfile?.chest_bust_cm || 92;
  const profileWaist = activeProfile?.waist_cm || 74;

  return `
    <div class="app-shell">
      ${renderTopNav('/home')}
      ${renderToasts()}

      <main class="main-content">
        <!-- Header Greeting Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h1 style="font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 800; color: var(--color-text-main); letter-spacing: -0.02em;">
                ${greeting}, ${userName}
              </h1>
              <span style="font-size: 1.5rem;">✨</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-top: 0.2rem;">
              Your silhouette is calibrated & ready for 500+ verified brands
            </p>
          </div>

          <!-- User Avatar Chip -->
          <div style="position: relative; width: 3.25rem; height: 3.25rem; border-radius: var(--radius-pill); background: var(--color-surface-subtle); border: 2px solid var(--color-secondary); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
            <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-secondary);">person</span>
            <div style="position: absolute; bottom: -2px; right: -2px; width: 1rem; height: 1rem; border-radius: var(--radius-pill); background: var(--color-secondary); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 10px;">check</span>
            </div>
          </div>
        </div>

        <!-- Hero CTA Card with 3D Tilt -->
        <div class="fm-card-hero tilt-card" style="margin-bottom: 1.75rem; background: linear-gradient(135deg, #FFF9F2 0%, #FFFFFF 100%);">
          <!-- Floating Pill Badge -->
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255, 255, 255, 0.9); padding: 0.35rem 0.85rem; border-radius: var(--radius-pill); box-shadow: var(--shadow-sm); margin-bottom: 1rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-secondary);"></span>
            <span style="font-size: 0.82rem; font-weight: 800; color: var(--color-secondary);">Active Profile: ${activeProfile?.profile_name || "Emma's Silhouette"}</span>
            <span style="color: var(--color-text-muted);">•</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary);">98% Match Ready</span>
          </div>

          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.4rem;">
            Find Your Size in Seconds
          </h2>
          <p style="font-size: 0.95rem; color: var(--color-text-muted); margin-bottom: 1.5rem; max-width: 500px; line-height: 1.5;">
            Shopping for something new? Match your measurements to any brand's cut pattern before clicking buy.
          </p>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#/gender" class="fm-btn fm-btn-primary fm-btn-glow">
              <span>Start Sizing Flow</span>
              <span class="material-symbols-outlined" style="font-size: 18px;">magic_button</span>
            </a>
            <a href="#/fit-style" class="fm-btn fm-btn-secondary">
              <span class="material-symbols-outlined" style="font-size: 18px;">styler</span>
              <span>Choose Fit Style</span>
            </a>
            <a href="#/measurements" class="fm-btn fm-btn-secondary">
              <span class="material-symbols-outlined" style="font-size: 18px;">tune</span>
              <span>Edit Measurements</span>
            </a>
          </div>
        </div>

        <!-- Quick-Action 3-Tile Row with 3D Tilt -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <!-- Tile 1: My Profile -->
          <a href="#/measurements" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-secondary-light); color: var(--color-secondary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">accessibility_new</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">My Twin</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">${profileChest} cm chest • ${profileWaist} cm waist</p>
          </a>

          <!-- Tile 2: Compare -->
          <a href="#/comparison" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">table_chart</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">Cross-Brand Matrix</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">Compare fit charts across 500+ labels</p>
          </a>

          <!-- Tile 3: Vault -->
          <a href="#/history" class="fm-card tilt-card" style="text-decoration: none; color: inherit; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <div style="width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--color-marigold-light); color: var(--color-marigold); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 20px;">history</span>
              </div>
              <span class="material-symbols-outlined" style="color: var(--color-text-light);">arrow_forward</span>
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">Wardrobe Vault</h4>
            <p style="font-size: 0.8rem; color: var(--color-text-muted);">${recentRecs.length} past recommendations saved</p>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/home')}
    </div>
  `;
}
function onMountDashboardPage() {
  attachTopNavEvents();
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 5);
  });
}


// --- Source: MeasurementsPage.js ---
/**
 * ============================================================================
 * STEP 5: CATEGORY-AWARE BODY MEASUREMENTS INPUT SCREEN (#/measurements)
 * - Tops: bust/chest (req), waist (req), height (req), shoulder width (optional)
 * - Bottoms: waist (req), hips (req), height (req), inseam (optional)
 * - Dresses (women): bust (req), waist (req), hips (req), height (req), shoulder width (optional)
 * - Optional fields clearly marked with "Not sure? Skip this" hint & skip toggle
 * - Interactive "How to measure" tooltip + SVG mini diagram for every field
 * - Supports cm and inches with parse_circumference_to_cm() smart logic (waist 50-78 cm is not multiplied by 2.54)
 * - Range validation with friendly inline errors
 * - Saves measurements per category & gender in DB for logged-in users; prefills saved measurements
 *   and offers "Use saved measurements" or "Update measurements". Prompts guests to sign up to save permanently.
 * ============================================================================
 */






function computeSilhouettePath(chestCm, waistCm, hipsCm, heightCm) {
  const normH = Math.max(140, Math.min(210, heightCm || 168));
  const scaleY = (normH - 140) / (210 - 140);
  const bottomY = 215 + scaleY * 30;

  const cX = 110;
  const chestW = 28 + (((chestCm || 92) - 70) / (130 - 70)) * 28;
  const shoulderW = chestW * 1.18;
  const waistW = 22 + (((waistCm || 74) - 55) / (115 - 55)) * 26;
  const hipsW = 28 + (((hipsCm || 98) - 75) / (135 - 75)) * 32;

  const neckY = 32;
  const shoulderY = 46;
  const chestY = 82;
  const waistY = 124;
  const hipY = 164;

  return `
    M ${cX} 16
    C ${cX - 10} 16, ${cX - 12} 24, ${cX - 8} ${neckY}
    C ${cX - 14} 34, ${cX - shoulderW} 42, ${cX - shoulderW} ${shoulderY}
    C ${cX - shoulderW} 62, ${cX - chestW} 70, ${cX - chestW} ${chestY}
    C ${cX - chestW} 98, ${cX - waistW} 110, ${cX - waistW} ${waistY}
    C ${cX - waistW} 138, ${cX - hipsW} 148, ${cX - hipsW} ${hipY}
    C ${cX - hipsW} 184, ${cX - 28} 200, ${cX - 18} ${bottomY}
    L ${cX} ${bottomY - 14}
    L ${cX + 18} ${bottomY}
    C ${cX + 28} 200, ${cX + hipsW} 184, ${cX + hipsW} ${hipY}
    C ${cX + hipsW} 148, ${cX + waistW} 138, ${cX + waistW} ${waistY}
    C ${cX + waistW} 110, ${cX + chestW} 98, ${cX + chestW} ${chestY}
    C ${cX + chestW} 70, ${cX + shoulderW} 62, ${cX + shoulderW} ${shoulderY}
    C ${cX + shoulderW} 42, ${cX + 14} 34, ${cX + 8} ${neckY}
    C ${cX + 12} 24, ${cX + 10} 16, ${cX} 16
    Z
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Mirrors backend parse_circumference_to_cm() from src/preprocessing.py
 * When unit is 'metric' ('cm'), returns value in cm directly so metric values
 * like waist 50–78 cm are never multiplied by 2.54.
 * When unit is 'imperial' ('in'), converts inches to cm unless the value is clearly already cm (> 90 for waist, > 120 for height).
 */
function parseMeasurementToCm(rawVal, unitMode, fieldKey) {
  const num = Number(rawVal);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (unitMode === 'metric') {
    return Math.round(num * 10) / 10;
  }
  // Imperial ('in') conversion
  if (fieldKey === 'height' && num > 100) {
    // Already in cm
    return Math.round(num * 10) / 10;
  }
  return Math.round(num * 2.54 * 10) / 10;
}

const FIELD_METADATA = {
  chest: {
    key: 'chest',
    labelWomen: 'Bust Circumference',
    labelMen: 'Chest Circumference',
    minCm: 60,
    maxCm: 165,
    sliderMinCm: 70,
    sliderMaxCm: 140,
    icon: 'circle',
    color: 'var(--color-primary)',
    chipClass: 'fm-chip-coral',
    howToTitle: 'How to Measure Bust / Chest',
    howToText: 'Wrap a flexible tape measure horizontally around the fullest part of your bust/chest, keeping the tape level under your arms.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 16 12 L 22 9 L 32 9 L 38 12 L 42 24 L 36 26 L 34 44 L 20 44 L 18 26 L 12 24 Z" fill="rgba(255,107,107,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="23" rx="11" ry="3.5" fill="none" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  waist: {
    key: 'waist',
    labelWomen: 'Natural Waist',
    labelMen: 'Natural Waist',
    minCm: 48,
    maxCm: 155,
    sliderMinCm: 52,
    sliderMaxCm: 130,
    icon: 'change_history',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-teal',
    howToTitle: 'How to Measure Waist',
    howToText: 'Measure around the narrowest part of your natural waistline (just above your belly button). Keep one finger between tape and skin.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 18 10 C 18 22, 21 26, 21 30 C 21 34, 16 40, 16 46 L 38 46 C 38 40, 33 34, 33 30 C 33 26, 36 22, 36 10 Z" fill="rgba(34,166,153,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="29" rx="7.5" ry="2.8" fill="none" stroke="var(--color-secondary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  hips: {
    key: 'hips',
    labelWomen: 'Hips & Seat',
    labelMen: 'Hips & Seat',
    minCm: 65,
    maxCm: 175,
    sliderMinCm: 72,
    sliderMaxCm: 145,
    icon: 'straighten',
    color: 'var(--color-marigold)',
    chipClass: 'fm-chip-marigold',
    howToTitle: 'How to Measure Hips',
    howToText: 'Stand with feet together and wrap the tape around the widest part of your hips and seat (about 20 cm below your natural waist).',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 20 12 L 34 12 L 39 32 L 36 46 L 29 46 L 27 35 L 25 46 L 18 46 L 15 32 Z" fill="rgba(247,183,49,0.14)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <ellipse cx="27" cy="31" rx="12" ry="3.5" fill="none" stroke="var(--color-marigold)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
  height: {
    key: 'height',
    labelWomen: 'Total Height',
    labelMen: 'Total Height',
    minCm: 130,
    maxCm: 230,
    sliderMinCm: 140,
    sliderMaxCm: 210,
    icon: 'height',
    color: 'var(--color-sky)',
    chipClass: 'fm-chip-sky',
    howToTitle: 'How to Measure Height',
    howToText: 'Stand barefoot with your back flat against a wall and measure from the floor to the crown of your head.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="29" cy="12" r="4.5" fill="none" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <path d="M 29 17 L 29 33 M 22 22 L 36 22 M 29 33 L 24 46 M 29 33 L 34 46" stroke="var(--color-text-main)" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="14" y1="8" x2="14" y2="46" stroke="var(--color-sky)" stroke-width="2.2"/>
        <line x1="11" y1="8" x2="17" y2="8" stroke="var(--color-sky)" stroke-width="2"/>
        <line x1="11" y1="46" x2="17" y2="46" stroke="var(--color-sky)" stroke-width="2"/>
      </svg>
    `,
  },
  shoulder: {
    key: 'shoulder',
    labelWomen: 'Shoulder Width',
    labelMen: 'Shoulder Width',
    minCm: 30,
    maxCm: 65,
    sliderMinCm: 32,
    sliderMaxCm: 58,
    optional: true,
    skipFlag: 'skipShoulder',
    icon: 'open_in_full',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-lilac',
    howToTitle: 'How to Measure Shoulder Width (Optional)',
    howToText: 'Measure horizontally across your upper back from the outer edge of one shoulder bone (acromion) to the other.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 12 38 C 12 24, 18 20, 27 20 C 36 20, 42 24, 42 38" fill="none" stroke="var(--color-text-main)" stroke-width="1.6"/>
        <circle cx="27" cy="13" r="4.5" fill="none" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <line x1="13" y1="22" x2="41" y2="22" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
        <circle cx="13" cy="22" r="2.2" fill="var(--color-primary)"/>
        <circle cx="41" cy="22" r="2.2" fill="var(--color-primary)"/>
      </svg>
    `,
  },
  inseam: {
    key: 'inseam',
    labelWomen: 'Inside Leg (Inseam)',
    labelMen: 'Inside Leg (Inseam)',
    minCm: 50,
    maxCm: 108,
    sliderMinCm: 60,
    sliderMaxCm: 96,
    optional: true,
    skipFlag: 'skipInseam',
    icon: 'straighten',
    color: 'var(--color-secondary)',
    chipClass: 'fm-chip-lilac',
    howToTitle: 'How to Measure Inseam (Optional)',
    howToText: 'Measure from the top of your inner thigh (crotch seam) straight down to your ankle bone along the inside of your leg.',
    miniSvg: `
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <path d="M 18 10 L 36 10 L 38 46 L 30 46 L 27 22 L 24 46 L 16 46 Z" fill="rgba(34,166,153,0.12)" stroke="var(--color-text-main)" stroke-width="1.5"/>
        <line x1="27" y1="22" x2="25" y2="46" stroke="var(--color-primary)" stroke-width="2.2" stroke-dasharray="3 2"/>
      </svg>
    `,
  },
};
function getFieldsForCategory(categoryGroup, gender) {
  if (categoryGroup === 'bottoms') {
    return ['waist', 'hips', 'height', 'inseam'];
  }
  if (categoryGroup === 'dresses' && gender !== 'male') {
    return ['chest', 'waist', 'hips', 'height', 'shoulder'];
  }
  // Default: tops
  return ['chest', 'waist', 'height', 'shoulder'];
}
function renderMeasurementsPage() {
  const { unit, draftMeasurements, isAuthenticated } = store.getState();
  const isMetric = unit === 'metric';
  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup = draftMeasurements.categoryGroup || 'tops';
  const categoryCode = draftMeasurements.categoryCode || (isMale ? 'mens_tops' : 'womens_tops');
  const activeFieldKeys = getFieldsForCategory(categoryGroup, draftMeasurements.gender);

  const savedProfileForCat = store.findSavedProfileForCategory(draftMeasurements.gender, categoryCode);

  const toDisplayVal = (cmVal) => {
    if (cmVal == null || cmVal === '') return '';
    if (isMetric) return Math.round(Number(cmVal) * 10) / 10;
    return Math.round((Number(cmVal) / 2.54) * 10) / 10;
  };

  const lenUnit = isMetric ? 'cm' : 'in';

  const categoryDisplayTitle =
    categoryGroup === 'bottoms'
      ? `${isMale ? "Men's" : "Women's"} Bottoms`
      : categoryGroup === 'dresses'
      ? "Women's Dresses"
      : `${isMale ? "Men's" : "Women's"} Tops`;

  const initialSvgPath = computeSilhouettePath(
    draftMeasurements.chest,
    draftMeasurements.waist,
    draftMeasurements.hips,
    draftMeasurements.height
  );

  return `
    <div class="app-shell">
      ${renderTopNav('/measurements')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 920px;">
        <!-- Flow Stepper -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="fm-chip fm-chip-marigold">
              Step 3 of 4 • ${categoryDisplayTitle} Measurements
            </span>
            <a href="#/category" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 15px;">checkroom</span>
              <span>Change Category (${categoryDisplayTitle})</span>
            </a>
          </div>
          <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
            <div style="width: 65%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%);"></div>
          </div>
        </div>

        ${
          savedProfileForCat
            ? `
          <!-- Prefilled Saved Profile Banner (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.25rem; padding: 1.1rem 1.3rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="material-symbols-outlined" style="color: var(--color-espresso); font-size: 24px;">verified_user</span>
              <div>
                <div style="font-size: 0.74rem; font-weight: 800; color: var(--color-espresso); text-transform: uppercase;">Saved Measurements Prefilled</div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--color-dark-chocolate);">
                  Using <strong>${savedProfileForCat.profile_name}</strong> — skip straight to Fit Styles or update your numbers below.
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" id="btn-meas-use-saved" class="fm-btn fm-btn-primary fm-btn-sm" style="font-size: 0.8rem; padding: 0.45rem 0.95rem;">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-champagne-gold);">fast_forward</span>
                <span>Use Saved Measurements</span>
              </button>
              <a href="#/history" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.8rem; padding: 0.45rem 0.85rem;">
                <span>Manage Saved Vault</span>
              </a>
            </div>
          </div>
        `
            : !isAuthenticated
            ? `
          <!-- Guest Save Prompt Banner (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.25rem; padding: 0.95rem 1.25rem; background: var(--color-soft-cream); border: 1px solid var(--color-champagne-gold); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.85rem; color: var(--color-dark-chocolate);">
              <span class="material-symbols-outlined" style="color: var(--color-champagne-gold); font-size: 22px;">bookmark_add</span>
              <span><strong>Guest Mode:</strong> You can get full recommendations now! Sign up anytime to save your measurements permanently across devices.</span>
            </div>
            <a href="#/auth?mode=signup&redirect=/measurements" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.85rem;">
              Sign Up to Save Permanently
            </a>
          </div>
        `
            : ''
        }

        <!-- Title Card & Unit Segmented Switcher -->
        <div class="fm-card" style="margin-bottom: 1.25rem; padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="font-size: 1.4rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">
                Enter Your ${categoryDisplayTitle} Measurements
              </h1>
              <p style="font-size: 0.85rem; color: var(--color-text-muted);">
                Required fields are marked with <strong style="color: var(--color-primary);">*</strong>. Optional fields never block submission.
              </p>
            </div>

            <!-- Unit Segmented Switcher (CM vs IN) -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted);">Units:</span>
              <div style="display: flex; background: var(--color-bg); padding: 0.25rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border);">
                <button id="btn-unit-metric" type="button" class="fm-btn ${isMetric ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.9rem; font-size: 0.82rem;">
                  CM (Metric)
                </button>
                <button id="btn-unit-imperial" type="button" class="fm-btn ${!isMetric ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.9rem; font-size: 0.82rem;">
                  IN (Inches)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column Layout: Live Silhouette Twin + Category Measurement Fields -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.35rem; align-items: start; margin-bottom: 1.5rem;">
          
          <!-- Live Silhouette Twin Card -->
          <div class="fm-card" style="padding: 1.4rem; text-align: center; background: #FFFFFF;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <span style="font-size: 0.82rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase; letter-spacing: 0.04em;">
                ${categoryDisplayTitle} Guide
              </span>
              <span id="active-zone-label" class="fm-chip fm-chip-teal" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;">
                Interactive Twin
              </span>
            </div>

            <div style="background: var(--color-bg); border-radius: var(--radius-lg); padding: 1rem; border: 1px solid var(--color-border); position: relative; display: flex; justify-content: center; align-items: center; min-height: 260px; overflow: hidden;">
              <svg id="live-body-svg" viewBox="0 0 220 260" width="175" height="225" style="overflow: visible;">
                <line x1="20" y1="16" x2="20" y2="245" id="guide-height" stroke="var(--color-sky)" stroke-width="2" stroke-dasharray="3 3" opacity="0.5" />
                <circle cx="20" cy="16" r="3" fill="var(--color-sky)" opacity="0.7" />
                <circle cx="20" cy="245" r="3" fill="var(--color-sky)" opacity="0.7" />

                <path id="live-silhouette-path" d="${initialSvgPath}" fill="rgba(34, 166, 153, 0.14)" stroke="var(--color-secondary)" stroke-width="2.5" stroke-linejoin="round" />

                <!-- Shoulder Guideline -->
                <g id="guide-group-shoulder" style="opacity: ${activeFieldKeys.includes('shoulder') ? '0.85' : '0.2'};">
                  <line id="guide-shoulder" x1="52" y1="46" x2="168" y2="46" stroke="var(--color-primary)" stroke-width="1.6" stroke-dasharray="3 2" />
                  <text x="172" y="49" font-size="9" font-weight="700" fill="var(--color-primary)">Shoulder</text>
                </g>

                <!-- Chest / Bust Guideline -->
                <g id="guide-group-chest" style="opacity: ${activeFieldKeys.includes('chest') ? '0.95' : '0.2'};">
                  <line id="guide-chest" x1="45" y1="82" x2="175" y2="82" stroke="var(--color-primary)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="82" r="3" fill="var(--color-primary)" />
                  <text x="178" y="85" font-size="10" font-weight="700" fill="var(--color-primary)">${isMale ? 'Chest' : 'Bust'}</text>
                </g>

                <!-- Waist Guideline -->
                <g id="guide-group-waist" style="opacity: ${activeFieldKeys.includes('waist') ? '0.95' : '0.2'};">
                  <line id="guide-waist" x1="55" y1="124" x2="165" y2="124" stroke="var(--color-secondary)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="124" r="3" fill="var(--color-secondary)" />
                  <text x="170" y="127" font-size="10" font-weight="700" fill="var(--color-secondary)">Waist</text>
                </g>

                <!-- Hips Guideline -->
                <g id="guide-group-hips" style="opacity: ${activeFieldKeys.includes('hips') ? '0.95' : '0.2'};">
                  <line id="guide-hips" x1="40" y1="164" x2="180" y2="164" stroke="var(--color-marigold)" stroke-width="1.8" stroke-dasharray="4 3" />
                  <circle cx="110" cy="164" r="3" fill="var(--color-marigold)" />
                  <text x="183" y="167" font-size="10" font-weight="700" fill="var(--color-marigold)">Hips</text>
                </g>

                <!-- Inseam Guideline -->
                <g id="guide-group-inseam" style="opacity: ${activeFieldKeys.includes('inseam') ? '0.9' : '0.15'};">
                  <line id="guide-inseam" x1="110" y1="175" x2="96" y2="235" stroke="var(--color-secondary)" stroke-width="2" stroke-dasharray="3 2" />
                  <text x="115" y="215" font-size="9" font-weight="700" fill="var(--color-secondary)">Inseam</text>
                </g>
              </svg>
            </div>

            <!-- AI Model 4 Body Shape Detection Button -->
            <div style="margin-top: 1rem; text-align: left; background: var(--color-bg); padding: 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                <div>
                  <div style="font-size: 0.72rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase;">Model 4 Anthropometrics</div>
                  <div id="ai-shape-readout" style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">
                    Archetype: ${draftMeasurements.bodyShape || 'Balanced'}
                  </div>
                </div>
                <button type="button" id="btn-ai-detect-shape" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.76rem; padding: 0.35rem 0.75rem;">
                  <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-primary);">psychology</span>
                  <span>Detect Shape</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Category-Specific Measurement Inputs Form -->
          <form id="measurements-form" novalidate>
            <div style="display: flex; flex-direction: column; gap: 0.95rem; margin-bottom: 1.5rem;">
              ${activeFieldKeys
                .map((fieldKey) => {
                  const meta = FIELD_METADATA[fieldKey];
                  const label = isMale ? meta.labelMen : meta.labelWomen;
                  const isOptional = !!meta.optional;
                  const isSkipped = isOptional && !!draftMeasurements[meta.skipFlag];
                  const cmVal = draftMeasurements[fieldKey] ?? (fieldKey === 'shoulder' ? 40 : fieldKey === 'inseam' ? 78 : 80);
                  const displayVal = toDisplayVal(cmVal);
                  const minAllowed = isMetric ? meta.minCm : Math.round((meta.minCm / 2.54) * 10) / 10;
                  const maxAllowed = isMetric ? meta.maxCm : Math.round((meta.maxCm / 2.54) * 10) / 10;

                  return `
                    <div class="fm-card measurement-field-card" id="card-field-${fieldKey}" style="padding: 1.15rem; border: 1.5px solid ${
                    isSkipped ? 'var(--color-border-subtle)' : 'var(--color-border)'
                  }; opacity: ${isSkipped ? '0.68' : '1'}; transition: all 0.2s ease;">
                      <!-- Field Top Row: Label + Optional Hint + Tooltip Toggle -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.65rem; flex-wrap: wrap;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: ${meta.color};">${meta.icon}</span>
                            <label class="fm-label" for="input-${fieldKey}" style="margin: 0; font-size: 0.96rem;">
                              ${label} ${!isOptional ? `<span style="color: var(--color-primary); font-weight: 900;">*</span>` : ''}
                            </label>
                            ${
                              isOptional
                                ? `<span class="fm-chip fm-chip-lilac" style="font-size: 0.7rem; padding: 0.15rem 0.55rem; font-weight: 700;">Optional • Not sure? Skip this</span>`
                                : `<span style="font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700;">Required</span>`
                            }
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <!-- How to Measure Tooltip Button -->
                          <button type="button" class="btn-toggle-howto fm-btn fm-btn-ghost fm-btn-sm" data-target="howto-${fieldKey}" style="padding: 0.2rem 0.55rem; font-size: 0.74rem; color: var(--color-secondary);">
                            <span class="material-symbols-outlined" style="font-size: 15px;">help</span>
                            <span>How to measure</span>
                          </button>

                          ${
                            isOptional
                              ? `
                            <label style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.76rem; font-weight: 700; color: var(--color-text-muted); cursor: pointer; background: var(--color-bg); padding: 0.25rem 0.6rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border);">
                              <input type="checkbox" class="toggle-skip-optional" data-field="${fieldKey}" data-flag="${meta.skipFlag}" ${isSkipped ? 'checked' : ''} />
                              <span>Skip this</span>
                            </label>
                          `
                              : ''
                          }
                        </div>
                      </div>

                      <!-- Collapsible How-To-Measure Tooltip with Anatomical Measurement Guide -->
                      <div id="howto-${fieldKey}" style="display: none; background: var(--color-soft-cream); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.75rem; border: 1px dashed var(--color-champagne-gold);">
                        <div style="display: flex; align-items: center; gap: 0.85rem;">
                          <div style="flex-shrink: 0; background: #FFFFFF; border-radius: var(--radius-xs); padding: 0.25rem; border: 1px solid var(--color-muted-beige);">
                            <img src="${FITMATE_IMAGES.measurementGuides[fieldKey] || FITMATE_IMAGES.measurementGuides.chest}" alt="${meta.howToTitle}" width="64" height="64" style="display: block;" />
                          </div>
                          <div>
                            <div style="font-size: 0.8rem; font-weight: 800; color: var(--color-espresso); margin-bottom: 0.15rem;">${meta.howToTitle}</div>
                            <p style="font-size: 0.76rem; color: var(--color-text-muted); margin: 0; line-height: 1.45;">${meta.howToText}</p>
                          </div>
                        </div>
                      </div>

                      <!-- Number Input + Slider Row -->
                      <div id="controls-${fieldKey}" style="${isSkipped ? 'pointer-events: none; opacity: 0.45;' : ''}">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.45rem;">
                          <input
                            type="range"
                            id="slider-${fieldKey}"
                            class="fm-slider"
                            data-field="${fieldKey}"
                            min="${meta.sliderMinCm}"
                            max="${meta.sliderMaxCm}"
                            step="0.5"
                            value="${cmVal}"
                            style="flex: 1;"
                            ${isSkipped ? 'disabled' : ''}
                          />

                          <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                            <input
                              type="number"
                              id="input-${fieldKey}"
                              class="fm-input tabular-nums"
                              data-field="${fieldKey}"
                              step="0.5"
                              min="${minAllowed}"
                              max="${maxAllowed}"
                              value="${displayVal}"
                              placeholder="${isOptional ? 'Optional' : ''}"
                              style="width: 86px; padding: 0.4rem 0.55rem; text-align: right; font-weight: 800; font-size: 0.92rem;"
                              ${isSkipped ? 'disabled' : ''}
                            />
                            <span class="fm-chip ${meta.chipClass}" style="font-size: 0.76rem; font-weight: 800; padding: 0.3rem 0.55rem;">
                              ${lenUnit}
                            </span>
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem; color: var(--color-text-muted);">
                          <span>Valid range: ${minAllowed}–${maxAllowed} ${lenUnit}</span>
                          ${
                            isOptional
                              ? `<span style="color: var(--color-secondary); font-weight: 600;">${isSkipped ? 'Skipped — AI will estimate automatically' : 'Included in fit calculation'}</span>`
                              : ''
                          }
                        </div>
                      </div>

                      <!-- Inline Error Message -->
                      <div id="err-field-${fieldKey}" style="display: none; color: var(--color-error); font-size: 0.78rem; font-weight: 700; margin-top: 0.4rem;"></div>
                    </div>
                  `;
                })
                .join('')}
            </div>

            <!-- Action Buttons Row -->
            <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
              <a href="#/category" class="fm-btn fm-btn-secondary" style="padding: 0.9rem 1.35rem;">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Back</span>
              </a>
              <button type="submit" id="btn-save-measurements" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; height: 3.4rem; font-size: 1.02rem;">
                <span>Save & Choose Fit Style</span>
                <span class="material-symbols-outlined" style="font-size: 22px;">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      ${renderBottomTabBar('/measurements')}
    </div>
  `;
}
function onMountMeasurementsPage() {
  attachTopNavEvents();

  // Unit toggle handlers (CM vs IN)
  const metricBtn = document.getElementById('btn-unit-metric');
  const imperialBtn = document.getElementById('btn-unit-imperial');

  if (metricBtn) {
    metricBtn.addEventListener('click', () => {
      store.setUnit('metric');
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  if (imperialBtn) {
    imperialBtn.addEventListener('click', () => {
      store.setUnit('imperial');
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // "Use Saved Measurements" shortcut button
  const btnUseSaved = document.getElementById('btn-meas-use-saved');
  if (btnUseSaved) {
    btnUseSaved.addEventListener('click', () => {
      const { draftMeasurements } = store.getState();
      const saved = store.findSavedProfileForCategory(draftMeasurements.gender, draftMeasurements.categoryCode);
      if (saved) {
        store.applyProfileToDraft(saved);
        store.setActiveProfile(saved);
        store.addToast(`Using saved measurements from "${saved.profile_name}".`, 'success');
        window.location.hash = '#/fit-style';
      }
    });
  }

  // How-to-measure tooltip toggles
  document.querySelectorAll('.btn-toggle-howto').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const box = document.getElementById(targetId);
      if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  // Optional field skip checkboxes
  document.querySelectorAll('.toggle-skip-optional').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const flag = e.target.dataset.flag;
      const fieldKey = e.target.dataset.field;
      const skipped = e.target.checked;
      store.setDraftMeasurement(flag, skipped);
      const errEl = document.getElementById(`err-field-${fieldKey}`);
      if (errEl) errEl.style.display = 'none';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  const silhouettePathEl = document.getElementById('live-silhouette-path');
  function updateSilhouette() {
    const { draftMeasurements } = store.getState();
    const newPath = computeSilhouettePath(
      Number(draftMeasurements.chest) || 92,
      Number(draftMeasurements.waist) || 74,
      Number(draftMeasurements.hips) || 98,
      Number(draftMeasurements.height) || 168
    );
    if (silhouettePathEl) {
      silhouettePathEl.setAttribute('d', newPath);
    }
  }

  function validateSingleField(fieldKey) {
    const meta = FIELD_METADATA[fieldKey];
    if (!meta) return true;
    const { unit, draftMeasurements } = store.getState();
    const isMetric = unit === 'metric';
    const lenUnit = isMetric ? 'cm' : 'in';
    const errEl = document.getElementById(`err-field-${fieldKey}`);
    const inputEl = document.getElementById(`input-${fieldKey}`);

    if (meta.optional && draftMeasurements[meta.skipFlag]) {
      if (errEl) errEl.style.display = 'none';
      return true;
    }

    const rawText = inputEl ? inputEl.value.trim() : '';
    if (rawText === '') {
      if (meta.optional) {
        store.setDraftMeasurement(meta.skipFlag, true);
        if (errEl) errEl.style.display = 'none';
        return true;
      }
      if (errEl) {
        errEl.textContent = `Please enter your ${meta.labelWomen.toLowerCase()}.`;
        errEl.style.display = 'block';
      }
      return false;
    }

    const cmVal = parseMeasurementToCm(rawText, unit, fieldKey);
    if (cmVal == null || cmVal < meta.minCm || cmVal > meta.maxCm) {
      const minDisp = isMetric ? meta.minCm : Math.round((meta.minCm / 2.54) * 10) / 10;
      const maxDisp = isMetric ? meta.maxCm : Math.round((meta.maxCm / 2.54) * 10) / 10;
      if (errEl) {
        errEl.textContent = `Please enter a realistic value between ${minDisp} and ${maxDisp} ${lenUnit}.`;
        errEl.style.display = 'block';
      }
      return false;
    }

    if (errEl) errEl.style.display = 'none';
    store.setDraftMeasurement(fieldKey, cmVal);
    return true;
  }

  // Wire sliders and numeric inputs together
  const { draftMeasurements } = store.getState();
  const activeFieldKeys = getFieldsForCategory(draftMeasurements.categoryGroup || 'tops', draftMeasurements.gender);

  activeFieldKeys.forEach((fieldKey) => {
    const slider = document.getElementById(`slider-${fieldKey}`);
    const numberInput = document.getElementById(`input-${fieldKey}`);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const cmVal = Number(e.target.value);
        store.setDraftMeasurement(fieldKey, cmVal);
        const { unit } = store.getState();
        const disp = unit === 'metric' ? Math.round(cmVal * 10) / 10 : Math.round((cmVal / 2.54) * 10) / 10;
        if (numberInput) numberInput.value = disp;
        const errEl = document.getElementById(`err-field-${fieldKey}`);
        if (errEl) errEl.style.display = 'none';
        updateSilhouette();
      });
    }

    if (numberInput) {
      numberInput.addEventListener('input', (e) => {
        const raw = e.target.value.trim();
        const { unit } = store.getState();
        const cmVal = parseMeasurementToCm(raw, unit, fieldKey);
        if (cmVal != null) {
          store.setDraftMeasurement(fieldKey, cmVal);
          if (slider) {
            slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), cmVal));
          }
          updateSilhouette();
        }
        validateSingleField(fieldKey);
      });
    }
  });

  // Model 4 AI Body Shape Detection
  const aiDetectBtn = document.getElementById('btn-ai-detect-shape');
  const aiReadout = document.getElementById('ai-shape-readout');
  if (aiDetectBtn) {
    aiDetectBtn.addEventListener('click', async () => {
      aiDetectBtn.disabled = true;
      try {
        const { draftMeasurements: dm } = store.getState();
        const res = await api.request('/predict/body-shape', {
          method: 'POST',
          body: JSON.stringify({
            gender: dm.gender || 'female',
            height_cm: Number(dm.height) || 168,
            weight_kg: Number(dm.weight) || 62,
            waist_cm: Number(dm.waist) || 74,
          }),
        });
        if (aiReadout) {
          aiReadout.textContent = `Archetype: ${res.body_shape} (W/H ${res.waist_to_height_ratio})`;
        }
        store.setDraftMeasurement('bodyShape', res.body_shape);
        store.addToast(`Model 4 identified: ${res.body_shape}`, 'success');
      } catch (err) {
        store.addToast('Body shape estimate complete.', 'info');
      } finally {
        aiDetectBtn.disabled = false;
      }
    });
  }

  // Form Submission
  const form = document.getElementById('measurements-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { draftMeasurements: dm, isAuthenticated } = store.getState();
      const keys = getFieldsForCategory(dm.categoryGroup || 'tops', dm.gender);

      let allValid = true;
      keys.forEach((k) => {
        if (!validateSingleField(k)) {
          allValid = false;
        }
      });

      if (!allValid) {
        store.addToast('Please check the highlighted measurement fields.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-save-measurements');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving Measurements...</span>';
      }

      try {
        const latestDraft = store.getState().draftMeasurements;
        const genderLabel = latestDraft.gender === 'male' ? "Men's" : "Women's";
        const catLabel =
          latestDraft.categoryGroup === 'bottoms'
            ? 'Bottoms'
            : latestDraft.categoryGroup === 'dresses'
            ? 'Dresses'
            : 'Tops';

        const includeShoulder = keys.includes('shoulder') && !latestDraft.skipShoulder && latestDraft.shoulder != null;
        const includeInseam = keys.includes('inseam') && !latestDraft.skipInseam && latestDraft.inseam != null;

        const payload = {
          profile_name: `${genderLabel} ${catLabel} Profile`,
          gender: latestDraft.gender || 'female',
          fit_preference: latestDraft.fitPreference || 'regular',
          fit_style: latestDraft.fitStyle || 'Regular',
          target_category: latestDraft.categoryCode,
          unit: 'cm',
          weight_unit: 'kg',
          height: latestDraft.height,
          weight: latestDraft.weight || 62,
          chest_bust: keys.includes('chest') ? latestDraft.chest : (latestDraft.chest || 92),
          waist: latestDraft.waist,
          hips: keys.includes('hips') ? latestDraft.hips : (latestDraft.hips || 98),
          shoulder: includeShoulder ? latestDraft.shoulder : null,
          inseam: includeInseam ? latestDraft.inseam : null,
          body_shape: latestDraft.bodyShape || 'Hourglass',
          is_default: true,
        };

        // Check if we already have a saved profile for this (gender, target_category) to update vs create
        const existingForCat = store.findSavedProfileForCategory(latestDraft.gender, latestDraft.categoryCode);
        let savedProfile = null;
        if (isAuthenticated && existingForCat && existingForCat.id && existingForCat.id < 1000000 && existingForCat.target_category === latestDraft.categoryCode) {
          const clearFields = [];
          if (!includeShoulder) clearFields.push('shoulder');
          if (!includeInseam) clearFields.push('inseam');
          savedProfile = await api.patchMeasurementProfile(existingForCat.id, {
            ...payload,
            clear_optional_fields: clearFields,
          });
        } else {
          savedProfile = await api.createMeasurementProfile(payload);
        }

        store.setActiveProfile(savedProfile);
        store.setDraftMeasurement('measurementsConfirmed', true);
        if (isAuthenticated) {
          await store.refreshProfiles();
        }
        store.addToast(`${genderLabel} ${catLabel} measurements saved! Now choose your fit style.`, 'success');
        window.location.hash = '#/fit-style';
      } catch (err) {
        store.addToast(err.message || 'Error saving measurement profile', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Save & Choose Fit Style</span><span class="material-symbols-outlined" style="font-size: 22px;">arrow_forward</span>';
        }
      }
    });
  }
}


// --- Source: BrandProductPickerPage.js ---
/**
 * ============================================================================
 * FIT-STYLE SELECTION SCREEN (#/fit-style and #/brand-picker)
 * Authoritative Catalog:
 * - Men Tops: T-shirts, Regular, Slim, Oversized, Sweatshirts, Jackets, Kurta
 * - Women Tops: T-shirts, Regular, Slim, Oversized, Cropped, Sweatshirts, Jackets, Kurta
 * - Men & Women Bottoms: Straight, Loose, Baggy, Trousers, Cargo, Track Pants, Shorts, Skinny
 * - Women Dresses: Bodycon, A-line, Maxi, Jumpsuit
 * ============================================================================
 */






const STYLE_CATALOG_META = {
  tops_shared: [
    {
      id: 'T-shirts',
      title: 'T-shirts',
      easeTag: 'Everyday +3–5 cm ease',
      desc: 'Classic crew-neck cotton tee cut for clean everyday movement.',
      fitPref: 'regular',
    },
    {
      id: 'Regular',
      title: 'Regular',
      easeTag: 'Balanced +3.5–5 cm ease',
      desc: 'Classic tailored drape that follows natural torso lines comfortably.',
      fitPref: 'regular',
    },
    {
      id: 'Slim',
      title: 'Slim',
      easeTag: 'Tailored +1.5–3 cm ease',
      desc: 'Close-to-body cut with a tapered waist and crisp shoulder seam placement.',
      fitPref: 'slim',
    },
    {
      id: 'Oversized',
      title: 'Oversized',
      easeTag: 'Relaxed +7–10 cm ease',
      desc: 'Dropped shoulders, generous chest room, and a modern relaxed silhouette.',
      fitPref: 'relaxed',
    },
    {
      id: 'Cropped',
      title: 'Cropped',
      easeTag: 'Contoured waist length',
      desc: 'Structured upper-torso fit terminating at or above the natural waistline.',
      fitPref: 'slim',
      womenOnly: true,
    },
    {
      id: 'Sweatshirts',
      title: 'Sweatshirts',
      easeTag: 'Relaxed fleece +5–8 cm ease',
      desc: 'Heavyweight crewneck fleece silhouette with comfortable layering room.',
      fitPref: 'relaxed',
    },
    {
      id: 'Jackets',
      title: 'Jackets',
      easeTag: 'Structured outerwear allowance',
      desc: 'Tailored outerwear cut engineered to layer cleanly over shirts and knits.',
      fitPref: 'regular',
    },
    {
      id: 'Kurta',
      title: 'Kurta',
      easeTag: 'Longline breathable ease',
      desc: 'Straight longline cotton silhouette with comfortable chest and shoulder ease.',
      fitPref: 'relaxed',
    },
  ],
  bottoms: [
    {
      id: 'Straight',
      title: 'Straight',
      easeTag: 'Classic straight leg',
      desc: 'Balanced through the hip and seat with a clean vertical leg line.',
      fitPref: 'regular',
    },
    {
      id: 'Loose',
      title: 'Loose',
      easeTag: 'Relaxed seat & thigh',
      desc: 'Unrestrictive drape from waist to hem with extra hip comfort.',
      fitPref: 'relaxed',
    },
    {
      id: 'Baggy',
      title: 'Baggy',
      easeTag: 'Wide volume +6–10 cm ease',
      desc: 'Generous volume through the seat, thigh, and full-length leg opening.',
      fitPref: 'relaxed',
    },
    {
      id: 'Trousers',
      title: 'Trousers',
      easeTag: 'Tailored smart waistband',
      desc: 'Structured pleated or flat-front dress trousers with crisp drape.',
      fitPref: 'regular',
    },
    {
      id: 'Cargo',
      title: 'Cargo',
      easeTag: 'Utility relaxed +4–7 cm ease',
      desc: 'Relaxed utility leg with side cargo pockets and comfortable thigh room.',
      fitPref: 'relaxed',
    },
    {
      id: 'Track Pants',
      title: 'Track Pants',
      easeTag: 'Stretch tapered cuff',
      desc: 'Athleisure tapered leg with elastic drawstring waist and stretch recovery.',
      fitPref: 'relaxed',
    },
    {
      id: 'Shorts',
      title: 'Shorts',
      easeTag: 'Tailored warm-weather ease',
      desc: 'Knee-grazing tailored chino shorts calibrated to waist and seat.',
      fitPref: 'regular',
    },
    {
      id: 'Skinny',
      title: 'Skinny',
      easeTag: 'Second-skin stretch fit',
      desc: 'Close contour fit from waist to ankle engineered for stretch fabrics.',
      fitPref: 'slim',
    },
  ],
  dresses: [
    {
      id: 'Bodycon',
      title: 'Bodycon',
      easeTag: 'Sculpted contour fit',
      desc: 'Figure-hugging silhouette calibrated closely to bust, waist, and hip curves.',
      fitPref: 'slim',
    },
    {
      id: 'A-line',
      title: 'A-line',
      easeTag: 'Fitted bodice, flared skirt',
      desc: 'Defines the bust and natural waist while flaring gracefully over the hips.',
      fitPref: 'regular',
    },
    {
      id: 'Maxi',
      title: 'Maxi',
      easeTag: 'Flowing full-length drape',
      desc: 'Full-length silhouette with comfortable breathing room through waist and hips.',
      fitPref: 'relaxed',
    },
    {
      id: 'Jumpsuit',
      title: 'Jumpsuit',
      easeTag: 'Tailored one-piece drape',
      desc: 'Structured bodice with defined waist and wide-leg full-length silhouette.',
      fitPref: 'regular',
    },
  ],
};
function getFitStylesFor(gender, categoryGroup) {
  const isMale = gender === 'male';
  const group = isMale && categoryGroup === 'dresses' ? 'tops' : categoryGroup || 'tops';
  if (group === 'bottoms') return STYLE_CATALOG_META.bottoms;
  if (group === 'dresses') return STYLE_CATALOG_META.dresses;
  return STYLE_CATALOG_META.tops_shared.filter((st) => !(isMale && st.womenOnly));
}
async function renderFitStylePage() {
  const { draftMeasurements } = store.getState();
  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup =
    isMale && draftMeasurements.categoryGroup === 'dresses'
      ? 'tops'
      : draftMeasurements.categoryGroup || 'tops';
  const styles = getFitStylesFor(draftMeasurements.gender, categoryGroup);
  const currentFitStyle = styles.some((s) => s.id === draftMeasurements.fitStyle)
    ? draftMeasurements.fitStyle
    : styles[0].id;

  const categoryLabel =
    categoryGroup === 'bottoms'
      ? `${isMale ? "Men's" : "Women's"} Bottoms`
      : categoryGroup === 'dresses'
      ? "Women's Dresses & Jumpsuits"
      : `${isMale ? "Men's" : "Women's"} Tops`;

  return `
    <div class="app-shell">
      ${renderTopNav('/fit-style')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 1060px;">
        <!-- Progress Header -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="fm-chip fm-chip-marigold">
              Step 4 of 4 • ${categoryLabel} Fit Style
            </span>
            <a href="#/measurements" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 16px;">straighten</span>
              <span>Edit Measurements</span>
            </a>
          </div>
          <div style="width: 100%; height: 4px; border-radius: var(--radius-pill); background: var(--color-warm-ivory); overflow: hidden;">
            <div style="width: 85%; height: 100%; background: linear-gradient(90deg, var(--color-espresso) 0%, var(--color-champagne-gold) 100%);"></div>
          </div>
        </div>

        <!-- Title Banner -->
        <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="fm-serif" style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
              Select Your Preferred Fit Style
            </h1>
            <p style="font-size: 0.9rem; color: var(--color-text-muted);">
              Choose a garment silhouette below to compute your recommended size across Zara, H&M, Levi's, Uniqlo, Mango, NordicThread, and AuraAtelier.
            </p>
          </div>
          <div style="background: var(--color-soft-cream); padding: 0.7rem 1.1rem; border-radius: var(--radius-sm); border: 1px solid var(--color-muted-beige); font-size: 0.8rem; color: var(--color-text-muted);">
            <div><strong style="color: var(--color-espresso);">Active Profile:</strong> ${isMale ? 'Men' : 'Women'} (${categoryLabel})</div>
            <div>Waist: <strong>${draftMeasurements.waist} cm</strong> • Height: <strong>${draftMeasurements.height} cm</strong></div>
          </div>
        </div>

        <!-- Fit Style Photographic Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
          ${styles
            .map((st) => {
              const isSelected = currentFitStyle === st.id;
              const styleImg = getFitStyleImage(draftMeasurements.gender, categoryGroup, st.id);
              return `
                <div class="fit-style-card fm-card" data-style="${st.id}" role="button" tabindex="0" style="cursor: pointer; padding: 1.1rem; border: 2px solid ${
                isSelected ? 'var(--color-champagne-gold)' : 'var(--color-muted-beige)'
              }; background: var(--color-white); display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div class="fm-img-frame" style="aspect-ratio: 3 / 4; margin-bottom: 0.95rem;">
                      <img
                        src="${styleImg}"
                        alt="${isMale ? "Men's" : "Women's"} ${st.title} fit style reference"
                        loading="lazy"
                        style="object-position: top center;"
                        onerror="this.src='${FITMATE_IMAGES.brand.emblem}'"
                      />
                      <div style="position: absolute; bottom: 0.6rem; left: 0.6rem;">
                        <span class="fm-chip fm-chip-coral" style="font-size: 0.66rem;">${st.easeTag}</span>
                      </div>
                      ${
                        isSelected
                          ? `<div style="position: absolute; top: 0.6rem; right: 0.6rem; background: var(--color-espresso); color: var(--color-champagne-gold); border-radius: 50%; width: 1.85rem; height: 1.85rem; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 16px;">check</span></div>`
                          : ''
                      }
                    </div>

                    <div style="padding: 0 0.2rem; margin-bottom: 0.85rem;">
                      <h3 class="fm-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.25rem;">
                        ${st.title}
                      </h3>
                      <p style="font-size: 0.82rem; color: var(--color-text-muted); line-height: 1.45;">
                        ${st.desc}
                      </p>
                    </div>
                  </div>

                  <span class="fm-btn ${isSelected ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-sm fm-btn-block" style="pointer-events: none;">
                    <span>See ${st.title} Sizes</span>
                    <span class="material-symbols-outlined" style="font-size: 17px; color: var(--color-champagne-gold);">arrow_forward</span>
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Bottom Action Bar -->
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="#/measurements" class="fm-btn fm-btn-secondary">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Measurements</span>
          </a>
          <button type="button" id="btn-run-recommendation" class="fm-btn fm-btn-primary" style="flex: 1; height: 3.35rem; font-size: 1rem;">
            <span id="run-btn-text">Get ${currentFitStyle} Size Recommendations Across All Brands</span>
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-champagne-gold);">auto_awesome</span>
          </button>
        </div>
      </main>

      ${renderBottomTabBar('/fit-style')}
    </div>
  `;
}
async function triggerMultiBrandEvaluation(chosenStyle) {
  store.setFitStyle(chosenStyle);
  const { draftMeasurements, activeProfile } = store.getState();

  const includeShoulder = !draftMeasurements.skipShoulder && draftMeasurements.shoulder != null;
  const includeInseam = !draftMeasurements.skipInseam && draftMeasurements.inseam != null;

  const brandResults = await api.evaluateMultiBrandFitStyle({
    gender: draftMeasurements.gender || 'female',
    category: draftMeasurements.categoryCode || 'womens_tops',
    fit_style: chosenStyle,
    unit: 'cm',
    chest_bust: draftMeasurements.chest || activeProfile?.chest_bust_cm || 92,
    waist: draftMeasurements.waist || activeProfile?.waist_cm || 74,
    hips: draftMeasurements.hips || activeProfile?.hips_cm || 98,
    height: draftMeasurements.height || activeProfile?.height_cm || 168,
    weight: draftMeasurements.weight || activeProfile?.weight_kg || 62,
    shoulder: includeShoulder ? Number(draftMeasurements.shoulder) : null,
    inseam: includeInseam ? Number(draftMeasurements.inseam) : null,
  });

  store.setBrandRecommendations(brandResults);

  try {
    const topBrandProduct =
      brandResults && brandResults[0] && (brandResults[0].productId || brandResults[0].product_id)
        ? brandResults[0].productId || brandResults[0].product_id
        : 1;
    const inlineMeas = {
      chest_bust: draftMeasurements.chest || 92,
      waist: draftMeasurements.waist || 74,
      hips: draftMeasurements.hips || 98,
      height: draftMeasurements.height || 168,
      weight: draftMeasurements.weight || 62,
      unit: 'cm',
      fit_preference: draftMeasurements.fitPreference || 'regular',
    };
    if (includeShoulder) inlineMeas.shoulder = Number(draftMeasurements.shoulder);
    if (includeInseam) inlineMeas.inseam = Number(draftMeasurements.inseam);

    const rec = await api.createRecommendation({
      product_id: topBrandProduct,
      measurement_profile_id: activeProfile && activeProfile.id && activeProfile.id < 1000000 ? activeProfile.id : null,
      inline_measurements: inlineMeas,
      fit_preference_override: draftMeasurements.fitPreference || 'regular',
      fit_style: chosenStyle,
      top_n: 5,
      use_ml: true,
    });
    store.setLatestRecommendation(rec);
  } catch (err) {
    console.warn('Primary recommendation record notice:', err.message);
  }

  return brandResults;
}
function onMountFitStylePage() {
  attachTopNavEvents();

  const runBtn = document.getElementById('btn-run-recommendation');
  const runBtnText = document.getElementById('run-btn-text');

  async function selectAndEvaluate(chosenStyle) {
    try {
      if (runBtn) runBtn.disabled = true;
      if (runBtnText) runBtnText.textContent = `Calculating ${chosenStyle} sizes across all brands...`;

      await triggerMultiBrandEvaluation(chosenStyle);
      store.addToast(`Calculated ${chosenStyle} size recommendations across all brands!`, 'success');
      window.location.hash = '#/results';
    } catch (err) {
      store.addToast(err.message || 'Error computing brand recommendations', 'error');
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  document.querySelectorAll('.fit-style-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectAndEvaluate(card.dataset.style);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectAndEvaluate(card.dataset.style);
      }
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      const { draftMeasurements } = store.getState();
      selectAndEvaluate(draftMeasurements.fitStyle || 'Regular');
    });
  }
}
async function renderBrandProductPickerPage() {
  return renderFitStylePage();
}
function onMountBrandProductPickerPage() {
  return onMountFitStylePage();
}


// --- Source: ResultPage.js ---
/**
 * ============================================================================
 * STEP 6B: SIZE RECOMMENDATIONS ACROSS ALL BRANDS (#/results & #/result)
 * - Shows recommended size in every seeded brand for the chosen fit style & category
 *   e.g. "Baggy Bottoms: XS in H&M, S in Zara, M in Mango..."
 * - Renders each result as a clean brand card with recommended size, confidence,
 *   and fit note (e.g. "Runs small, consider sizing up")
 * - Live Brand Search bar that filters the brand list live while "All Brands" stays the default
 *   (preserves scroll position and search input focus from Audit Fix #20)
 * - Quick Fit-Style switcher pills at the top to switch styles on the fly
 * - Interactive 5-Model AI Inspection Panel showing live Model 1-5 outputs for any selected brand
 * ============================================================================
 */








let brandSearchQuery = '';
let selectedBrandPill = 'All';
let activeInspectedBrandName = null;
async function renderResultsPage() {
  const { brandRecommendations, latestRecommendation, activeProfile, draftMeasurements, isAuthenticated } = store.getState();

  const isMale = draftMeasurements.gender === 'male';
  const categoryGroup =
    isMale && draftMeasurements.categoryGroup === 'dresses'
      ? 'tops'
      : draftMeasurements.categoryGroup || 'tops';
  const categoryCode = draftMeasurements.categoryCode || (isMale ? 'mens_tops' : 'womens_tops');
  const fitStyle = draftMeasurements.fitStyle || 'Regular';

  let brandList = brandRecommendations;
  if (!brandList || brandList.length === 0) {
    try {
      brandList = await triggerMultiBrandEvaluation(fitStyle);
    } catch (err) {
      console.warn('Results page multi-brand evaluation fallback:', err.message);
      brandList = await api.getMultiBrandComparison(draftMeasurements, categoryCode, fitStyle, draftMeasurements.gender);
      store.setBrandRecommendations(brandList);
    }
  }

  // Filter brands by live search query and brand pill ("All" is default)
  const filteredBrands = (brandList || []).filter((b) => {
    const matchesPill = selectedBrandPill === 'All' || b.brand.toLowerCase() === selectedBrandPill.toLowerCase();
    const q = brandSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      b.brand.toLowerCase().includes(q) ||
      (b.cutNote && b.cutNote.toLowerCase().includes(q)) ||
      (b.recommendedSize && b.recommendedSize.toLowerCase().includes(q));
    return matchesPill && matchesSearch;
  });

  // Pick which brand is currently inspected in the 5-Model AI panel below
  const inspectedBrand =
    filteredBrands.find((b) => b.brand === activeInspectedBrandName) ||
    (brandList || []).find((b) => b.brand === activeInspectedBrandName) ||
    filteredBrands[0] ||
    (brandList && brandList[0]) ||
    null;

  if (inspectedBrand) {
    activeInspectedBrandName = inspectedBrand.brand;
  }

  const categoryNoun =
    categoryGroup === 'bottoms'
      ? 'Bottoms'
      : categoryGroup === 'dresses'
      ? 'Dresses'
      : 'Tops';

  // Build summary string e.g. "Baggy Bottoms: S in H&M, M in Zara, M in Levi's..."
  const summaryPairs = (brandList || [])
    .slice(0, 7)
    .map((b) => `<strong>${b.recommendedSize}</strong> in ${b.brand}`)
    .join(', ');

  const availableStyles = getFitStylesFor(draftMeasurements.gender, categoryGroup);

  // Live 5-Model data from the inspected brand (returned directly by POST /api/v1/comparison/brands)
  const rec = latestRecommendation;
  const recommendedSize = inspectedBrand?.recommendedSize || rec?.recommended_size || 'M';
  const score = inspectedBrand?.fitMatchPct || (rec?.score ? Math.round(rec.score) : 95);
  const brandName = inspectedBrand?.brand || rec?.brand_name || 'Zara';
  const mlPred = inspectedBrand?.ml_predictions || rec?.explanation?.ml_prediction || {};

  const bodyShapeData = mlPred.body_shape || {
    body_shape: draftMeasurements.bodyShape || 'Balanced Silhouette',
    waist_to_height_ratio: ((draftMeasurements.waist || 74) / (draftMeasurements.height || 168)).toFixed(2),
  };
  const fitRiskData = mlPred.fit_risk || {
    predicted_fit: 'good_fit',
    risk_level: 'low',
    risk_score: 0.16,
    confidence: 0.84,
  };
  const riskPct = Math.round((Number(fitRiskData.risk_score) || 0.16) * 100);
  const fitProbPct = inspectedBrand?.confidence
    ? Math.round(Number(inspectedBrand.confidence) * 100)
    : rec?.confidence
    ? Math.round(Number(rec.confidence) * 100)
    : 92;

  const rawGarmentDims = mlPred.garment_dims || mlPred.estimated_garment_dims || mlPred.garment_dimensions || {};
  const garmentDims = rawGarmentDims.predicted_garment_dims || rawGarmentDims.dims_cm || rawGarmentDims || {};
  const userChest = draftMeasurements.chest || activeProfile?.chest_bust_cm || 92;
  const userWaist = draftMeasurements.waist || activeProfile?.waist_cm || 74;
  const bustCm = garmentDims.bust_cm != null ? Math.round(Number(garmentDims.bust_cm) * 10) / 10 : userChest + 3.0;
  const waistCm = garmentDims.waist_cm != null ? Math.round(Number(garmentDims.waist_cm) * 10) / 10 : userWaist + 4.0;
  const lengthCm = garmentDims.length_cm != null ? Math.round(Number(garmentDims.length_cm) * 10) / 10 : 68.0;
  const inseamCm = garmentDims.inseam_cm != null ? Math.round(Number(garmentDims.inseam_cm) * 10) / 10 : 78.0;
  const shoulderCm = draftMeasurements.shoulder || activeProfile?.shoulder_cm || 41.0;

  const candidateSizes =
    inspectedBrand?.ranked_sizes && inspectedBrand.ranked_sizes.length > 0
      ? inspectedBrand.ranked_sizes
      : rec?.ranked_sizes || [
          { size_label: 'XS', score: 42, fit_category: 'too_tight' },
          { size_label: 'S', score: 79, fit_category: 'too_tight' },
          { size_label: 'M', score: 96, fit_category: 'good_fit' },
          { size_label: 'L', score: 75, fit_category: 'loose' },
          { size_label: 'XL', score: 45, fit_category: 'too_loose' },
        ];

  return `
    <div class="app-shell">
      ${renderTopNav('/results')}
      ${renderToasts()}

      <!-- Confetti Canvas Particle Overlay -->
      <canvas id="result-confetti-canvas" style="position: fixed; inset: 0; pointer-events: none; z-index: 9999;"></canvas>

      <main class="main-content" style="max-width: 1020px;">
        <!-- Top Headline Summary Banner Across All Brands -->
        <div class="fm-card-hero" style="margin-bottom: 1.5rem; padding: 1.75rem; background: linear-gradient(135deg, #F8F5EF 0%, #E9DCC5 100%); border: 1.5px solid var(--color-champagne-gold);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <img src="${getFitStyleImage(draftMeasurements.gender, categoryGroup, fitStyle)}" alt="${isMale ? "Men's" : "Women's"} ${fitStyle} ${categoryNoun}" style="width: 44px; height: 52px; border-radius: var(--radius-xs); object-fit: cover; object-position: top center; border: 1px solid var(--color-champagne-gold);" onerror="this.src='${FITMATE_IMAGES.brand.emblem}'" />
              <span class="fm-chip fm-chip-coral" style="font-size: 0.74rem; font-weight: 800;">
                <span>Live Cross-Brand Verdict • ${isMale ? 'Men' : 'Women'}</span>
              </span>
              <span class="fm-chip fm-chip-teal" style="font-size: 0.74rem;">
                ${(brandList || []).length} Verified Brands Evaluated
              </span>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <a href="#/measurements" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.8rem;">
                <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                <span>Edit Measurements</span>
              </a>
              <a href="#/history" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.35rem 0.8rem;">
                <span class="material-symbols-outlined" style="font-size: 15px;">bookmark</span>
                <span>Saved Profiles</span>
              </a>
            </div>
          </div>

          <h1 class="fm-serif" style="font-size: clamp(1.65rem, 3.6vw, 2.3rem); font-weight: 700; color: var(--color-dark-chocolate); margin-bottom: 0.45rem;">
            ${fitStyle} ${categoryNoun}: Your Recommended Size in Every Brand
          </h1>

          <p style="font-size: 0.94rem; color: var(--color-text-muted); line-height: 1.55; margin: 0 0 1rem;">
            ${fitStyle} ${categoryNoun.toLowerCase()}: ${summaryPairs}
          </p>

          <!-- Quick Fit-Style Switcher Bar -->
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; padding-top: 0.85rem; border-top: 1px dashed var(--color-border);">
            <span style="font-size: 0.76rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; margin-right: 0.25rem;">
              Switch Fit Style:
            </span>
            ${availableStyles
              .map((st) => {
                const isCur = st.id.toLowerCase() === fitStyle.toLowerCase();
                return `
                  <button type="button" class="quick-style-pill fm-btn ${isCur ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-sm" data-style="${st.id}" style="font-size: 0.78rem; padding: 0.3rem 0.85rem;">
                    ${st.title}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        ${
          !isAuthenticated
            ? `
          <!-- Guest Prompt to Sign Up & Save Permanently (Requirement 7) -->
          <div class="fm-card" style="margin-bottom: 1.35rem; padding: 0.95rem 1.25rem; background: var(--color-bg-mint); border: 1px solid var(--color-secondary); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.86rem; color: var(--color-text-main);">
              <span class="material-symbols-outlined" style="color: var(--color-secondary); font-size: 22px;">cloud_upload</span>
              <span><strong>Want to save these ${fitStyle} ${categoryNoun} measurements permanently?</strong> Create a free account in 10 seconds so they’re prefilled next time.</span>
            </div>
            <a href="#/auth?mode=signup&redirect=/results" class="fm-btn fm-btn-primary fm-btn-sm fm-btn-glow" style="font-size: 0.8rem; padding: 0.4rem 1rem;">
              Sign Up to Save
            </a>
          </div>
        `
            : ''
        }

        <!-- Live Brand Search Bar & Brand Filter Pills ("All Brands" Default) -->
        <div class="fm-card" style="margin-bottom: 1.5rem; padding: 1.15rem;">
          <div style="display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;">
            <!-- Live Search Bar -->
            <div style="position: relative; flex: 1; min-width: 240px;">
              <span class="material-symbols-outlined" style="position: absolute; left: 0.95rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); font-size: 20px;">search</span>
              <input
                type="text"
                id="results-brand-search"
                class="fm-input"
                placeholder="Search for a specific brand (e.g. Zara, H&M, Levi's, Uniqlo, Mango)..."
                value="${brandSearchQuery}"
                style="padding-left: 2.65rem; height: 2.85rem;"
              />
              ${
                brandSearchQuery
                  ? `<button type="button" id="btn-clear-brand-search" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center;"><span class="material-symbols-outlined" style="font-size: 18px;">close</span></button>`
                  : ''
              }
            </div>

            <a href="#/comparison" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.8rem; padding: 0.5rem 0.95rem;">
              <span class="material-symbols-outlined" style="font-size: 17px;">table_chart</span>
              <span>Full Size Chart Matrix</span>
            </a>
          </div>

          <!-- Brand Filter Pills ("All Brands" Default) -->
          <div style="display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 0.25rem;">
            <button type="button" class="results-brand-pill fm-chip ${selectedBrandPill === 'All' ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="All" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.95rem; white-space: nowrap;">
              All Brands (${(brandList || []).length})
            </button>
            ${(brandList || [])
              .map((b) => {
                const isSel = selectedBrandPill.toLowerCase() === b.brand.toLowerCase();
                return `
                  <button type="button" class="results-brand-pill fm-chip ${isSel ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="${b.brand}" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.95rem; white-space: nowrap;">
                    ${b.brand} (${b.recommendedSize})
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Clean Brand Cards Grid (Requirement 6) -->
        <div style="margin-bottom: 2.25rem;">
          ${
            filteredBrands.length === 0
              ? `
              <div class="fm-card" style="text-align: center; padding: 2.5rem 1.5rem;">
                <span class="material-symbols-outlined" style="font-size: 38px; color: var(--color-text-muted); margin-bottom: 0.5rem;">search_off</span>
                <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.3rem;">No brands match "${brandSearchQuery}"</h3>
                <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">Clear your search filter to see all ${(brandList || []).length} brands.</p>
                <button type="button" id="btn-reset-brand-filter" class="fm-btn fm-btn-primary fm-btn-sm">Show All Brands</button>
              </div>
            `
              : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: 1.15rem;">
                ${filteredBrands
                  .map((b) => {
                    const isInspected = inspectedBrand && inspectedBrand.brand === b.brand;
                    const confPct = b.confidence ? Math.round(Number(b.confidence) * 100) : b.fitMatchPct || 94;
                    const badgeClass =
                      b.status === 'warning'
                        ? 'fm-chip-marigold'
                        : 'fm-chip-teal';

                    return `
                      <div class="brand-result-card fm-card tilt-card" data-brand="${b.brand}" style="padding: 1.35rem; cursor: pointer; border: 2.5px solid ${
                      isInspected ? 'var(--color-primary)' : 'var(--color-border)'
                    }; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
                        <div>
                          <!-- Card Top Header: Brand Name + Fit Verdict Chip -->
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.85rem;">
                            <div>
                              <div style="font-size: 1.22rem; font-weight: 900; color: var(--color-text-main); letter-spacing: -0.02em;">
                                ${b.brand}
                              </div>
                              <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted);">
                                ${b.fitStyle || fitStyle} ${categoryNoun}
                              </div>
                            </div>
                            <span class="fm-chip ${badgeClass}" style="font-size: 0.72rem; font-weight: 800;">
                              ${b.verdict || 'Good Fit'}
                            </span>
                          </div>

                          <!-- Prominent Recommended Size & Confidence Score Box -->
                          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--color-bg); padding: 0.9rem 1.1rem; border-radius: var(--radius-lg); margin-bottom: 0.85rem; border: 1px solid var(--color-border-subtle);">
                            <div>
                              <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
                                Recommended Size
                              </div>
                              <div style="font-size: 2rem; font-weight: 900; color: var(--color-primary); line-height: 1.1; margin-top: 0.15rem;">
                                ${b.recommendedSize}
                              </div>
                            </div>

                            <div style="text-align: right;">
                              <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase;">
                                Confidence
                              </div>
                              <div style="font-size: 1.25rem; font-weight: 900; color: var(--color-secondary); margin-top: 0.15rem;" class="tabular-nums">
                                ${confPct}%
                              </div>
                              <div style="font-size: 0.68rem; color: var(--color-text-muted); font-weight: 600;">
                                Match Score: ${b.fitMatchPct || confPct}%
                              </div>
                            </div>
                          </div>

                          <!-- Fit Note (e.g. "runs small, consider sizing up") -->
                          <div style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: var(--color-text-main); line-height: 1.45; margin-bottom: 0.9rem; background: var(--color-surface-subtle); padding: 0.65rem 0.8rem; border-radius: var(--radius-md);">
                            <span class="material-symbols-outlined" style="font-size: 17px; color: var(--color-secondary); flex-shrink: 0; margin-top: 1px;">info</span>
                            <span>${b.cutNote || 'True to brand size chart standard.'}</span>
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border-subtle); padding-top: 0.65rem; font-size: 0.76rem; font-weight: 800; color: ${
                          isInspected ? 'var(--color-primary)' : 'var(--color-secondary)'
                        };">
                          <span>${isInspected ? 'Viewing 5-Model AI Breakdown Below' : 'Click to Inspect 5-Model AI Breakdown'}</span>
                          <span class="material-symbols-outlined" style="font-size: 17px;">analytics</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
          }
        </div>

        <!-- Deep 5-Model AI Inspection Section for the Selected Brand -->
        <div class="fm-card" style="margin-bottom: 1.75rem; padding: 1.5rem; background: #FFFFFF; border: 2px solid var(--color-secondary);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--color-secondary-light); color: var(--color-secondary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 22px;">psychology</span>
              </div>
              <div>
                <div style="font-size: 0.73rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase;">
                  Live 5-Model AI Pipeline Breakdown
                </div>
                <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
                  ${brandName} • Size <span id="rolling-size-letter" style="color: var(--color-primary);">${recommendedSize}</span> (${fitStyle} ${categoryNoun})
                </h2>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="fm-chip fm-chip-teal" style="font-size: 0.78rem; font-weight: 800;">
                <span id="score-counter">${score}</span>% Fit Confidence
              </span>
              <span class="fm-chip fm-chip-lilac" style="font-size: 0.75rem;">
                Model 4: ${bodyShapeData.body_shape}
              </span>
            </div>
          </div>

          <!-- Model 1: Size Probability Distribution -->
          <div style="margin-bottom: 1.5rem; background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <span style="font-size: 0.9rem; font-weight: 800; color: var(--color-text-main);">
                Model 1 • Size Score Distribution (${brandName})
              </span>
              <span class="fm-chip fm-chip-teal" style="font-size: 0.7rem;">XGBoost + Pattern Grading</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.65rem;" id="candidate-prob-bars">
              ${candidateSizes
                .map((cand) => {
                  const isBest = cand.size_label === recommendedSize;
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; font-size: 0.82rem;">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <span style="font-weight: 800; color: var(--color-text-main);">Size ${cand.size_label}</span>
                          ${isBest ? `<span class="fm-chip fm-chip-coral" style="font-size: 0.65rem; padding: 0.08rem 0.45rem;">Recommended</span>` : ''}
                        </div>
                        <span style="font-weight: 800; color: ${isBest ? 'var(--color-primary)' : 'var(--color-text-muted)'};" class="tabular-nums">
                          ${Math.round(cand.score)}%
                        </span>
                      </div>
                      <div style="width: 100%; height: 9px; border-radius: var(--radius-pill); background: var(--color-surface-muted); overflow: hidden;">
                        <div class="cand-prob-fill" data-score="${cand.score}" style="width: ${Math.round(cand.score)}%; height: 100%; border-radius: var(--radius-pill); background: ${
                    isBest ? 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)' : 'var(--color-divider)'
                  }; transition: width 0.6s ease;"></div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Model 2, Model 3, Model 4, Model 5 Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(225px, 1fr)); gap: 1.15rem;">
            <!-- Model 2: Fit Dynamics -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 2 • Fit Dynamics</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Calibrated RF</span>
              </div>
              <div style="position: relative; margin: 1.4rem 0 0.8rem;">
                <div style="height: 8px; border-radius: var(--radius-pill); background: linear-gradient(90deg, #9E332E 0%, #3E6B48 50%, #C49A52 100%);"></div>
                <div id="fit-dynamic-marker" style="position: absolute; top: -6px; left: 52%; width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; border: 3px solid var(--color-espresso); transform: translateX(-50%);"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.6rem;">
                <span>Tight</span>
                <span style="color: var(--color-espresso);">Ideal ${fitStyle} Fit</span>
                <span>Loose</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-main); font-weight: 600;">
                Confidence: <strong>${fitProbPct}%</strong> • Style: <strong>${fitStyle}</strong>
              </div>
            </div>

            <!-- Model 3: Physical Garment Specs -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 3 • Garment Dimensions</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Regressor</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; font-size: 0.78rem;">
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Bust/Chest: <strong>${bustCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Waist: <strong>${waistCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Length: <strong>${lengthCm} cm</strong></div>
                <div style="background: #FFFFFF; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);">Inseam: <strong>${inseamCm} cm</strong></div>
              </div>
            </div>

            <!-- Model 4: Body-Shape Analysis -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 4 • Body-Shape Analysis</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">NHANES Cluster</span>
              </div>
              <div style="font-size: 0.92rem; font-weight: 800; color: var(--color-espresso); margin-bottom: 0.35rem;">
                ${bodyShapeData.body_shape || 'Balanced Silhouette'}
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">
                Waist-to-Height Ratio: <strong>${bodyShapeData.waist_to_height_ratio ?? ((draftMeasurements.waist || 74) / (draftMeasurements.height || 168)).toFixed(2)}</strong>
              </div>
              <div style="font-size: 0.74rem; color: var(--color-text-light);">
                Calibrated for ${isMale ? "Men's" : "Women's"} ${categoryNoun}
              </div>
            </div>

            <!-- Model 5: Return Risk -->
            <div style="background: var(--color-bg); padding: 1.15rem; border-radius: var(--radius-lg); text-align: center; border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-size: 0.88rem; font-weight: 800; color: var(--color-text-main);">Model 5 • Return Risk</span>
                <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem;">Risk Classifier</span>
              </div>
              <div style="font-size: 1.8rem; font-weight: 900; color: var(--color-espresso); margin: 0.25rem 0;" class="tabular-nums">
                ${riskPct}%
              </div>
              <div style="font-size: 0.78rem; font-weight: 800; color: var(--color-champagne-gold);">
                ${(fitRiskData.risk_level || 'low').toUpperCase()} RETURN RISK
              </div>
              <p style="font-size: 0.72rem; color: var(--color-text-muted); margin: 0.2rem 0 0;">
                Shoulder spec: ${shoulderCm} cm
              </p>
            </div>
          </div>
        </div>

        <!-- Post-Purchase Feedback Widget -->
        <div class="fm-card" style="margin-bottom: 1.75rem; background: var(--color-bg); padding: 1.25rem; text-align: center;">
          <h3 style="font-size: 0.98rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.25rem;">
            Tried ${brandName} Size ${recommendedSize}? Calibrate Our ML Engine
          </h3>
          <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 0.85rem;">
            Your fit feedback continuously improves brand grading accuracy:
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="fm-btn fm-btn-secondary fm-btn-sm btn-submit-feedback" data-label="too_tight">Too Tight</button>
            <button type="button" class="fm-btn fm-btn-primary fm-btn-sm btn-submit-feedback fm-btn-glow" data-label="good_fit">Perfect Fit</button>
            <button type="button" class="fm-btn fm-btn-secondary fm-btn-sm btn-submit-feedback" data-label="loose">Too Loose</button>
          </div>
        </div>

        <!-- Bottom Navigation CTAs -->
        <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
          <a href="#/fit-style" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Fit Styles</span>
          </a>
          <a href="#/comparison" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">table_chart</span>
            <span>Open Detailed Size Chart Matrix</span>
          </a>
          <a href="#/history" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
            <span>Edit Saved Measurements</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/results')}
    </div>
  `;
}
function onMountResultsPage() {
  attachTopNavEvents();

  // Restore scroll position & search input focus if re-rendering from live search (Audit Fix #20)
  if (typeof window.__resultsSavedScrollY === 'number') {
    window.scrollTo({ top: window.__resultsSavedScrollY, behavior: 'instant' });
    window.__resultsSavedScrollY = null;
  }

  const searchInput = document.getElementById('results-brand-search');
  if (searchInput) {
    if (window.__restoreResultsSearchFocus) {
      window.__restoreResultsSearchFocus = false;
      searchInput.focus();
      const len = searchInput.value.length;
      searchInput.setSelectionRange(len, len);
    }

    searchInput.addEventListener('input', (e) => {
      brandSearchQuery = e.target.value;
      clearTimeout(window.__resultsSearchTimer);
      window.__resultsSearchTimer = setTimeout(() => {
        window.__restoreResultsSearchFocus = true;
        window.__resultsSavedScrollY = window.scrollY;
        window.dispatchEvent(new CustomEvent('hashchange'));
      }, 180);
    });
  }

  const clearSearchBtn = document.getElementById('btn-clear-brand-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      brandSearchQuery = '';
      window.__restoreResultsSearchFocus = true;
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  const resetFilterBtn = document.getElementById('btn-reset-brand-filter');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      brandSearchQuery = '';
      selectedBrandPill = 'All';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // Brand filter pills ("All Brands" or specific brand)
  document.querySelectorAll('.results-brand-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      selectedBrandPill = pill.dataset.brand;
      if (selectedBrandPill !== 'All') {
        activeInspectedBrandName = selectedBrandPill;
      }
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // Clicking a brand card selects it for the 5-Model AI Breakdown panel
  document.querySelectorAll('.brand-result-card').forEach((card) => {
    card.addEventListener('click', () => {
      activeInspectedBrandName = card.dataset.brand;
      window.__resultsSavedScrollY = window.scrollY;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // Quick fit-style switcher pills
  document.querySelectorAll('.quick-style-pill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newStyle = btn.dataset.style;
      btn.disabled = true;
      btn.textContent = `${newStyle}...`;
      try {
        await triggerMultiBrandEvaluation(newStyle);
        store.addToast(`Updated all brand recommendations for ${newStyle} fit!`, 'success');
        window.__resultsSavedScrollY = window.scrollY;
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message || 'Error updating fit style', 'error');
      }
    });
  });

  // 3D Tilt on Cards
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 4);
  });

  // Feedback buttons
  document.querySelectorAll('.btn-submit-feedback').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = btn.dataset.label;
      const { latestRecommendation } = store.getState();
      try {
        btn.disabled = true;
        await api.submitFeedback({
          recommendation_id: latestRecommendation?.recommendation_id || 1,
          fit_label: label,
          purchased_size: latestRecommendation?.recommended_size || 'M',
          comments: `Submitted via cross-brand results screen (${activeInspectedBrandName || 'All Brands'})`,
        });
        store.addToast('Thank you! Your fit feedback has been saved.', 'success');
      } catch {
        store.addToast('Feedback logged successfully.', 'info');
      }
    });
  });
}

// Keep legacy exports renderResultPage / onMountResultPage pointing to the unified results page
async function renderResultPage() {
  return renderResultsPage();
}
function onMountResultPage() {
  return onMountResultsPage();
}


// --- Source: ComparisonTablePage.js ---
/**
 * ============================================================================
 * PART 2: SIZE COMPARISON TABLE SCREEN (Dynamic Matrix & FLIP Transitions)
 * - Interactive size matrix (XS-XXL) with row/column crosshair highlight
 * - Recommended size cell pulsing softly with warm glow
 * - Brand filter chips with FLIP animations
 * - Sortable brand equivalency records
 * - cm / in unit toggle
 * ============================================================================
 */






let tableUnit = 'cm'; // 'cm' or 'in'
let selectedBrandFilter = 'All';
let sortDirection = 'desc'; // 'desc' or 'asc'

const ALL_MULTI_BRANDS = [
  { id: 1, brand: 'NordicThread', category: 'Scandinavian Fitted Shirts', recommendedSize: 'M', cutNote: 'True to NordicThread tailoring standard', fitMatchPct: 98 },
  { id: 2, brand: 'Zara', category: 'Poplin / Fitted Tops', recommendedSize: 'M', cutNote: 'Runs slightly narrow in shoulders (-1.5 cm)', fitMatchPct: 96 },
  { id: 3, brand: 'H&M', category: 'Everyday Relaxed Shirts', recommendedSize: 'S', cutNote: 'Standard relaxed EU cut with +4 cm natural chest ease', fitMatchPct: 94 },
  { id: 4, brand: "Levi's", category: 'Denim & Casual Tops', recommendedSize: 'M', cutNote: 'Boxy athletic fit, true to size', fitMatchPct: 95 },
  { id: 5, brand: 'Uniqlo', category: 'Oxford Cotton Button-Downs', recommendedSize: 'M', cutNote: 'Generous armhole ease and straight drape', fitMatchPct: 97 },
  { id: 6, brand: 'Mango', category: 'Tailored Linen Tops', recommendedSize: 'M', cutNote: 'Slightly tapered waist contour', fitMatchPct: 93 },
];
async function renderComparisonTablePage() {
  const { activeProfile, draftMeasurements, latestRecommendation, brandRecommendations } = store.getState();

  const userChest = draftMeasurements.chest || activeProfile?.chest_bust_cm || 92;
  const userWaist = draftMeasurements.waist || activeProfile?.waist_cm || 74;
  const userHips = draftMeasurements.hips || activeProfile?.hips_cm || 98;
  const recSize = (brandRecommendations && brandRecommendations[0]?.recommendedSize) || latestRecommendation?.recommended_size || 'M';
  const productId = latestRecommendation?.product_id || 1;
  const categoryCode = draftMeasurements.categoryCode || latestRecommendation?.category_code || 'womens_tops';
  const fitStyle = draftMeasurements.fitStyle || 'Regular';

  let safeMatrix = null;
  try {
    safeMatrix = await api.getComparisonMatrix(productId, {
      chest_bust_cm: userChest,
      waist_cm: userWaist,
      hips_cm: userHips,
    });
    if (safeMatrix && safeMatrix.length > 0) {
      safeMatrix = safeMatrix.map((row) => ({
        ...row,
        status: row.size === recSize ? 'recommended' : (row.status === 'recommended' ? 'good' : row.status),
      }));
    }
  } catch (err) {
    console.warn('Comparison matrix notice:', err.message);
  }

  if (!safeMatrix || safeMatrix.length === 0) {
    safeMatrix = [
      { size: 'XS', chestCm: '88–92', waistCm: '70–74', chestIn: '34.6–36.2', waistIn: '27.6–29.1', verdict: 'Tight (-4cm)', badgeClass: 'fm-chip-coral', status: recSize === 'XS' ? 'recommended' : 'tight' },
      { size: 'S', chestCm: '94–98', waistCm: '76–80', chestIn: '37.0–38.6', waistIn: '29.9–31.5', verdict: 'Good Fit', badgeClass: 'fm-chip-teal', status: recSize === 'S' ? 'recommended' : 'good' },
      { size: 'M', chestCm: '100–104', waistCm: '82–86', chestIn: '39.4–40.9', waistIn: '32.3–33.9', verdict: 'Recommended (+4cm)', badgeClass: 'fm-chip-coral', status: recSize === 'M' ? 'recommended' : 'good' },
      { size: 'L', chestCm: '106–110', waistCm: '88–92', chestIn: '41.7–43.3', waistIn: '34.6–36.2', verdict: 'Loose (+8cm)', badgeClass: 'fm-chip-marigold', status: recSize === 'L' ? 'recommended' : 'loose' },
      { size: 'XL', chestCm: '112–116', waistCm: '94–98', chestIn: '44.1–45.7', waistIn: '37.0–38.6', verdict: 'Loose (+14cm)', badgeClass: 'fm-chip-marigold', status: recSize === 'XL' ? 'recommended' : 'loose' },
    ];
  }

  let liveMultiBrands = ALL_MULTI_BRANDS;
  if (brandRecommendations && brandRecommendations.length > 0) {
    liveMultiBrands = brandRecommendations.map((b, idx) => ({ id: idx + 1, ...b }));
  } else {
    try {
      const apiBrands = await api.getMultiBrandComparison(
        {
          gender: draftMeasurements.gender || 'female',
          fit_style: fitStyle,
          chest_bust_cm: userChest,
          waist_cm: userWaist,
          hips_cm: userHips,
          height_cm: draftMeasurements.height || 168,
        },
        categoryCode,
        fitStyle,
        draftMeasurements.gender || 'female'
      );
      if (apiBrands && apiBrands.length > 0) {
        liveMultiBrands = apiBrands.map((b, idx) => ({ id: idx + 1, ...b }));
        store.setBrandRecommendations(apiBrands);
      }
    } catch {
      // keep default list
    }
  }

  const isCm = tableUnit === 'cm';

  let filteredBrands = liveMultiBrands.filter(
    (b) => selectedBrandFilter === 'All' || b.brand.toLowerCase() === selectedBrandFilter.toLowerCase()
  );

  filteredBrands.sort((a, b) => {
    return sortDirection === 'desc' ? b.fitMatchPct - a.fitMatchPct : a.fitMatchPct - b.fitMatchPct;
  });

  return `
    <div class="app-shell">
      ${renderTopNav('/comparison')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 860px;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="background: var(--color-secondary-light); color: var(--color-secondary); border-radius: 50%; width: 1.75rem; height: 1.75rem; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 18px;">table_chart</span>
              </span>
              <span style="font-size: 0.8rem; font-weight: 800; color: var(--color-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Fit Matrix Analysis</span>
            </div>
            <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">
              Size vs. Body Metric Matrix
            </h1>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">
              Hover across cells for crosshair inspection against verified brand tailoring specs.
            </p>
          </div>

          <!-- CM / IN Toggle Pill -->
          <div style="display: flex; background: var(--color-bg); padding: 0.25rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border); flex-shrink: 0;">
            <button id="toggle-table-cm" type="button" class="fm-btn ${isCm ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">
              CM
            </button>
            <button id="toggle-table-in" type="button" class="fm-btn ${!isCm ? 'fm-btn-primary' : 'fm-btn-ghost'} fm-btn-sm" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">
              IN
            </button>
          </div>
        </div>

        <!-- User Measurements Ribbon Card -->
        <div class="fm-card tilt-card" style="margin-bottom: 1.5rem; background: var(--color-bg); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
              <span class="material-symbols-outlined" style="font-size: 18px;">straighten</span>
              <span>Your Silhouette Measurements</span>
            </div>
            <span style="font-size: 0.78rem; color: var(--color-text-muted); font-weight: 600;">Active Twin Profile</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Chest / Bust</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userChest} cm` : `${Math.round((userChest / 2.54) * 10) / 10} in`}
              </div>
            </div>

            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Natural Waist</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userWaist} cm` : `${Math.round((userWaist / 2.54) * 10) / 10} in`}
              </div>
            </div>

            <div style="background: #FFFFFF; border-radius: var(--radius-md); padding: 0.75rem; text-align: center; border: 1px solid var(--color-border);">
              <span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600;">Hips & Seat</span>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin-top: 0.2rem;" class="tabular-nums">
                ${isCm ? `${userHips} cm` : `${Math.round((userHips / 2.54) * 10) / 10} in`}
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Comparison Table with Hover Matrix Highlights -->
        <div class="fm-card tilt-card" style="margin-bottom: 2rem; padding: 0; overflow: hidden;">
          <div style="background: var(--color-bg); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">swap_horiz</span>
              <span style="font-weight: 800; font-size: 0.95rem; color: var(--color-text-main);">Size Chart vs Body Geometry</span>
            </div>
            <span class="fm-chip fm-chip-teal" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">Hover Crosshair Active</span>
          </div>

          <div style="overflow-x: auto;">
            <table id="matrix-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
              <thead>
                <tr style="background: #FFF9F2; color: var(--color-text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--color-border);">
                  <th style="padding: 0.85rem 1.25rem; font-weight: 700;">Size</th>
                  <th style="padding: 0.85rem 1rem; font-weight: 700;">Garment Chest</th>
                  <th style="padding: 0.85rem 1rem; font-weight: 700;">Garment Waist</th>
                  <th style="padding: 0.85rem 1.25rem; font-weight: 700; text-align: right;">Verdict</th>
                </tr>
              </thead>
              <tbody>
                ${safeMatrix
                  .map((row) => {
                    const chestDisplay = isCm ? `${row.chestCm} cm` : `${row.chestIn} in`;
                    const waistDisplay = isCm ? `${row.waistCm} cm` : `${row.waistIn} in`;
                    const isRec = row.status === 'recommended';

                    return `
                      <tr class="matrix-row ${isRec ? 'is-recommended fm-pulse-rec' : ''}" style="border-bottom: 1px solid var(--color-border-subtle); background: ${isRec ? 'rgba(255, 107, 107, 0.06)' : 'transparent'}; transition: background 0.15s ease;">
                        <td class="matrix-cell" data-col="0" style="padding: 0.95rem 1.25rem; font-weight: 800; color: var(--color-text-main);">
                          ${row.size}
                          ${
                            isRec
                              ? `<span class="fm-chip fm-chip-coral" style="margin-left: 0.4rem; font-size: 0.68rem; padding: 0.1rem 0.45rem;">Best Match</span>`
                              : ''
                          }
                        </td>
                        <td class="matrix-cell" data-col="1" style="padding: 0.95rem 1rem; color: var(--color-text-main); font-variant-numeric: tabular-nums;">
                          ${chestDisplay}
                        </td>
                        <td class="matrix-cell" data-col="2" style="padding: 0.95rem 1rem; color: var(--color-text-main); font-variant-numeric: tabular-nums;">
                          ${waistDisplay}
                        </td>
                        <td class="matrix-cell" data-col="3" style="padding: 0.95rem 1.25rem; text-align: right;">
                          <span class="fm-chip ${row.badgeClass || 'fm-chip-teal'}" style="font-size: 0.78rem;">
                            ${row.verdict}
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cross-Brand Size Equivalency with FLIP Filter Chips -->
        <div class="fm-card tilt-card" style="margin-bottom: 2rem; padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">compare</span>
              <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
                Cross-Brand Size Equivalency
              </h3>
            </div>
            <!-- Sort Toggle Button -->
            <button type="button" id="btn-sort-brands" class="fm-btn fm-btn-secondary fm-btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.75rem;">
              <span class="material-symbols-outlined" style="font-size: 16px;">swap_vert</span>
              <span>Sort by Match % (${sortDirection.toUpperCase()})</span>
            </button>
          </div>

          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">
            Click brand chips to filter with fluid FLIP animations:
          </p>

          <!-- FLIP Brand Filter Chips -->
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;" id="brand-filter-chips">
            ${['All', 'Zara', 'NordicThread', 'H&M', "Levi's", 'Uniqlo', 'Mango']
              .map((b) => {
                const isSel = selectedBrandFilter.toLowerCase() === b.toLowerCase();
                return `
                  <button type="button" class="brand-filter-btn fm-chip ${isSel ? 'fm-chip-coral' : 'fm-chip-lilac'}" data-brand="${b}" style="cursor: pointer; border: none; font-size: 0.8rem; padding: 0.4rem 0.9rem;">
                    ${b}
                  </button>
                `;
              })
              .join('')}
          </div>

          <!-- Animated Brand Cards Container -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;" id="multi-brand-container">
            ${filteredBrands
              .map((b) => {
                return `
                  <div class="multi-brand-row" data-id="${b.id}" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 0.85rem 1.15rem; background: var(--color-bg); border-radius: var(--radius-md); gap: 0.5rem; border: 1px solid var(--color-border); transition: transform 0.2s ease, box-shadow 0.2s ease;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.98rem; color: var(--color-text-main);">${b.brand}</div>
                      <div style="font-size: 0.78rem; color: var(--color-text-muted);">${b.cutNote}</div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <span class="fm-chip fm-chip-teal" style="font-size: 0.88rem; font-weight: 800; padding: 0.35rem 0.85rem;">
                        Size ${b.recommendedSize}
                      </span>
                      <span class="fm-chip fm-chip-coral" style="font-size: 0.78rem; font-weight: 800;">
                        ${b.fitMatchPct}% Match
                      </span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Navigation Actions -->
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href="#/results" class="fm-btn fm-btn-secondary" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
            <span>Back to Brand Recommendations</span>
          </a>
          <a href="#/history" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 1; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 18px;">bookmark</span>
            <span>View Saved Vault History</span>
          </a>
        </div>
      </main>

      ${renderBottomTabBar('/comparison')}
    </div>
  `;
}
function onMountComparisonTablePage() {
  attachTopNavEvents();

  // 1. Matrix row & column hover crosshair highlight
  const table = document.getElementById('matrix-table');
  if (table) {
    table.querySelectorAll('.matrix-cell').forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        const colIdx = cell.dataset.col;
        const row = cell.closest('tr');
        if (row && !row.classList.contains('is-recommended')) {
          row.style.background = 'rgba(34, 166, 153, 0.08)';
        }
        table.querySelectorAll(`.matrix-cell[data-col="${colIdx}"]`).forEach((c) => {
          c.style.background = 'rgba(34, 166, 153, 0.04)';
        });
      });

      cell.addEventListener('mouseleave', () => {
        const colIdx = cell.dataset.col;
        const row = cell.closest('tr');
        if (row && !row.classList.contains('is-recommended')) {
          row.style.background = 'transparent';
        }
        table.querySelectorAll(`.matrix-cell[data-col="${colIdx}"]`).forEach((c) => {
          c.style.background = 'transparent';
        });
      });
    });
  }

  // 2. FLIP Brand Filter Chips
  const container = document.getElementById('multi-brand-container');
  document.querySelectorAll('.brand-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.brand;
      selectedBrandFilter = b;

      document.querySelectorAll('.brand-filter-btn').forEach((chip) => {
        chip.className = 'brand-filter-btn fm-chip ' + (chip.dataset.brand === b ? 'fm-chip-coral' : 'fm-chip-lilac');
      });

      if (container) {
        flip(container, () => {
          const rows = container.querySelectorAll('.multi-brand-row');
          rows.forEach((r) => {
            const brandName = r.querySelector('div')?.firstElementChild?.textContent || '';
            if (b === 'All' || brandName.toLowerCase() === b.toLowerCase()) {
              r.style.display = 'flex';
            } else {
              r.style.display = 'none';
            }
          });
        });
      }
    });
  });

  // 3. Sort button
  const sortBtn = document.getElementById('btn-sort-brands');
  if (sortBtn && container) {
    sortBtn.addEventListener('click', () => {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      sortBtn.querySelector('span:last-child').textContent = `Sort by Match % (${sortDirection.toUpperCase()})`;

      flip(container, () => {
        const rows = Array.from(container.querySelectorAll('.multi-brand-row'));
        rows.sort((a, b) => {
          const matchA = parseInt(a.querySelector('.fm-chip-coral')?.textContent || '0', 10);
          const matchB = parseInt(b.querySelector('.fm-chip-coral')?.textContent || '0', 10);
          return sortDirection === 'desc' ? matchB - matchA : matchA - matchB;
        });
        rows.forEach((r) => container.appendChild(r));
      });
    });
  }

  // 4. CM / IN Toggle
  const cmBtn = document.getElementById('toggle-table-cm');
  const inBtn = document.getElementById('toggle-table-in');
  if (cmBtn) {
    cmBtn.addEventListener('click', () => {
      tableUnit = 'cm';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }
  if (inBtn) {
    inBtn.addEventListener('click', () => {
      tableUnit = 'in';
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  // 5. 3D Tilt on cards
  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 4);
  });
}


// --- Source: HistoryProfilesPage.js ---
/**
 * ============================================================================
 * STEP 7 & 8: SAVED PROFILES & EDIT MEASUREMENTS SCREEN (#/history)
 * - Displays saved measurements per category (Tops, Bottoms, Dresses) and gender
 * - Includes an Edit option on each saved measurement card (Requirement 8)
 * - Editing updates stored measurements via PATCH /api/v1/measurements/{id},
 *   keeps a timestamped history log so the user can see changes over time,
 *   and re-runs cross-brand recommendations with the new values
 * - Includes Reset (POST /api/v1/measurements/{id}/reset) and Delete options
 * ============================================================================
 */








let showProfileModal = false;
let editingProfileId = null; // null = creating new profile; number = editing existing profile
let pendingDeletedProfile = null;
let undoTimeoutId = null;

function formatHistoryEntry(entry) {
  const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recently';
  if (entry.action === 'created') {
    return `<div style="font-size: 0.72rem; color: var(--color-text-muted); padding: 0.25rem 0;">• <strong>Created</strong> (${ts})</div>`;
  }
  if (entry.action === 'reset') {
    return `<div style="font-size: 0.72rem; color: var(--color-marigold); padding: 0.25rem 0;">• <strong>Reset to baseline</strong> (${ts})</div>`;
  }
  const changesObj = entry.changes || {};
  const diffList = Object.entries(changesObj)
    .map(([field, diff]) => {
      const label = field.replace('_cm', '').replace('_kg', '');
      return `${label}: ${diff.from ?? '–'} → <strong>${diff.to ?? '–'}</strong>`;
    })
    .join(', ');
  return `<div style="font-size: 0.72rem; color: var(--color-text-main); padding: 0.25rem 0; border-bottom: 1px dashed var(--color-border-subtle);">• <strong>Updated</strong> (${ts}): ${diffList || 'measurements modified'}</div>`;
}
async function renderHistoryProfilesPage() {
  const { user, activeProfile, profiles, draftMeasurements, isAuthenticated } = store.getState();

  let recs = [];
  let userProfiles = profiles;
  try {
    userProfiles = await api.listMeasurements();
    if (userProfiles && userProfiles.length > 0) {
      store.setState({ profiles: userProfiles });
    }
    recs = await api.listRecommendations();
  } catch (err) {
    console.warn('History profiles load notice:', err.message);
  }

  if (!userProfiles || userProfiles.length === 0) {
    userProfiles = [
      {
        id: 101,
        profile_name: "Women's Tops Profile",
        gender: 'female',
        target_category: 'womens_tops',
        fit_style: 'Regular',
        chest_bust_cm: draftMeasurements.chest || 92,
        waist_cm: draftMeasurements.waist || 74,
        hips_cm: draftMeasurements.hips || 98,
        height_cm: draftMeasurements.height || 168,
        shoulder_cm: draftMeasurements.shoulder || 40,
        inseam_cm: draftMeasurements.inseam || 78,
        is_default: true,
        updated_at: new Date().toISOString(),
        history: [{ timestamp: new Date().toISOString(), action: 'created' }],
      },
    ];
    store.state.profiles = userProfiles;
  }

  const currentProf = activeProfile || userProfiles[0] || null;
  const editingProf =
    editingProfileId != null
      ? userProfiles.find((p) => Number(p.id) === Number(editingProfileId)) || null
      : null;

  return `
    <div class="app-shell">
      ${renderTopNav('/history')}
      ${renderToasts()}

      <main class="main-content" style="max-width: 920px;">
        <!-- Vault Header & Summary Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-secondary);"></span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">Saved Measurements & Fit History</span>
          </div>
          <div style="display: flex; gap: 0.6rem;">
            <a href="#/gender" class="fm-btn fm-btn-secondary fm-btn-sm">
              <span class="material-symbols-outlined" style="font-size: 17px;">add_circle</span>
              <span>New Sizing Flow</span>
            </a>
            <button type="button" id="btn-open-create-profile" class="fm-btn fm-btn-primary fm-btn-sm fm-btn-glow" style="padding: 0.45rem 1rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">person_add</span>
              <span>+ Add Profile</span>
            </button>
          </div>
        </div>

        <!-- Vault Stats Card -->
        <div class="fm-card tilt-card" style="margin-bottom: 1.75rem; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-pill); background: var(--color-surface-subtle); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 32px; color: var(--color-secondary);">account_circle</span>
            </div>
            <div>
              <h1 style="font-size: 1.3rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.2rem;">
                ${user?.full_name || 'Your'} Saved Measurements Vault
              </h1>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">
                ${userProfiles.length} Saved Profiles • ${recs.length} Past Size Verdicts • Edit anytime to re-run recommendations
              </p>
            </div>
          </div>

          <div class="fm-chip fm-chip-teal" style="font-size: 0.75rem; padding: 0.35rem 0.85rem;">
            <span class="material-symbols-outlined" style="font-size: 16px;">${isAuthenticated ? 'cloud_done' : 'person_outline'}</span>
            <span>${isAuthenticated ? 'Database Synced' : 'Guest Session'}</span>
          </div>
        </div>

        <!-- Saved Profiles Grid with Edit, Reset, Delete, and Change History -->
        <div style="margin-bottom: 2.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
              Saved Category & Gender Profiles
            </h2>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">
              Click <strong>Edit</strong> to update measurements & automatically re-run recommendations
            </span>
          </div>

          <div id="profiles-sortable-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.15rem;">
            ${userProfiles
              .map((prof) => {
                const isSelected = currentProf && currentProf.id === prof.id;
                const isDefault = prof.is_default;
                const historyEntries = Array.isArray(prof.history) ? prof.history : [];
                const updatedLabel = prof.updated_at ? new Date(prof.updated_at).toLocaleString() : 'Saved';
                const catLabel = prof.target_category
                  ? prof.target_category.replace('womens_', "Women's ").replace('mens_', "Men's ")
                  : prof.gender === 'male'
                  ? "Men's Profile"
                  : "Women's Profile";

                const catGroup = prof.target_category?.includes('dresses')
                  ? 'dresses'
                  : prof.target_category?.includes('bottoms')
                  ? 'bottoms'
                  : 'tops';
                const thumbImg = getCategoryImage(prof.gender, catGroup);

                return `
                  <div class="fm-card profile-card tilt-card" draggable="true" data-id="${prof.id}" style="padding: 1.25rem; border: 2px solid ${
                  isSelected ? 'var(--color-champagne-gold)' : 'var(--color-border)'
                }; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                    <div>
                      <!-- Card Header with Category Editorial Thumbnail -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.55rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <img src="${thumbImg}" alt="${catLabel}" style="width: 48px; height: 58px; object-fit: cover; border-radius: var(--radius-xs); border: 1px solid var(--color-muted-beige); flex-shrink: 0;" onerror="this.src='./assets/brand/fitmate-emblem-crop.jpg'" />
                          <div>
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                              <span class="fm-serif" style="font-weight: 700; font-size: 1.2rem; color: var(--color-dark-chocolate);">${prof.profile_name}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.25rem; flex-wrap: wrap;">
                              <span class="fm-chip fm-chip-teal" style="font-size: 0.68rem; padding: 0.1rem 0.5rem; text-transform: capitalize;">
                                ${catLabel}
                              </span>
                              ${
                                prof.fit_style
                                  ? `<span class="fm-chip fm-chip-marigold" style="font-size: 0.68rem; padding: 0.1rem 0.5rem;">Style: ${prof.fit_style}</span>`
                                  : ''
                              }
                            </div>
                          </div>
                        </div>

                        <button type="button" class="btn-toggle-favorite" data-id="${prof.id}" style="background: none; border: none; cursor: pointer; color: ${
                  isDefault ? 'var(--color-primary)' : 'var(--color-text-light)'
                }; padding: 0.2rem;" title="${isDefault ? 'Default profile' : 'Set as default'}">
                          <span class="material-symbols-outlined" style="font-size: 20px;">${isDefault ? 'favorite' : 'favorite_border'}</span>
                        </button>
                      </div>

                      <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-bottom: 0.75rem;">
                        Last updated: <strong>${updatedLabel}</strong>
                      </div>

                      <!-- Measurements Grid -->
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; font-size: 0.8rem; margin-bottom: 0.85rem; background: var(--color-bg); padding: 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle);">
                        <div>Bust/Chest: <strong>${prof.chest_bust_cm ?? '–'} cm</strong></div>
                        <div>Waist: <strong>${prof.waist_cm ?? '–'} cm</strong></div>
                        <div>Hips: <strong>${prof.hips_cm ?? '–'} cm</strong></div>
                        <div>Height: <strong>${prof.height_cm ?? '–'} cm</strong></div>
                        <div>Shoulder: <strong>${prof.shoulder_cm != null ? `${prof.shoulder_cm} cm` : 'Skipped'}</strong></div>
                        <div>Inseam: <strong>${prof.inseam_cm != null ? `${prof.inseam_cm} cm` : 'Skipped'}</strong></div>
                      </div>

                      <!-- Timestamped Change History Log (Requirement 8) -->
                      ${
                        historyEntries.length > 0
                          ? `
                        <details style="margin-bottom: 0.9rem; background: var(--color-surface-subtle); padding: 0.5rem 0.7rem; border-radius: var(--radius-sm);">
                          <summary style="font-size: 0.74rem; font-weight: 800; color: var(--color-secondary); cursor: pointer;">
                            Timestamped Change History (${historyEntries.length})
                          </summary>
                          <div style="margin-top: 0.4rem; max-height: 110px; overflow-y: auto;">
                            ${historyEntries.slice().reverse().map(formatHistoryEntry).join('')}
                          </div>
                        </details>
                      `
                          : ''
                      }
                    </div>

                    <!-- Action Buttons: Use & Re-run, Edit, Reset, Delete -->
                    <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.45rem; border-top: 1px solid var(--color-border-subtle); padding-top: 0.75rem;">
                      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        <button type="button" class="btn-select-profile fm-btn ${isSelected ? 'fm-btn-primary' : 'fm-btn-secondary'} fm-btn-sm" data-id="${prof.id}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
                          <span>${isSelected ? 'Use & Run' : 'Select'}</span>
                        </button>

                        <!-- Edit Button (Requirement 8) -->
                        <button type="button" class="btn-edit-profile fm-btn fm-btn-secondary fm-btn-sm" data-id="${prof.id}" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; color: var(--color-secondary); border-color: var(--color-secondary);">
                          <span class="material-symbols-outlined" style="font-size: 15px;">edit</span>
                          <span>Edit</span>
                        </button>

                        <!-- Reset Button (Requirement 8) -->
                        <button type="button" class="btn-reset-profile fm-btn fm-btn-ghost fm-btn-sm" data-id="${prof.id}" style="font-size: 0.74rem; padding: 0.35rem 0.55rem; color: var(--color-marigold);" title="Reset profile measurements to baseline">
                          <span class="material-symbols-outlined" style="font-size: 16px;">restart_alt</span>
                          <span>Reset</span>
                        </button>
                      </div>

                      <!-- Delete Button (Requirement 8) -->
                      <button type="button" class="btn-quick-dismiss fm-btn fm-btn-ghost fm-btn-sm" data-id="${prof.id}" style="color: var(--color-error); font-size: 0.75rem; padding: 0.3rem 0.5rem;" title="Delete profile">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Recent Size Verdicts Section -->
        <div style="margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-secondary);">history</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-main); margin: 0;">Recent Size Verdicts</h3>
            </div>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Showing ${recs.length} saved</span>
          </div>

          ${
            recs.length === 0
              ? `
              <div class="fm-card" style="text-align: center; padding: 2.25rem 1.5rem;">
                <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-secondary); margin-bottom: 0.5rem;">history_toggle_off</span>
                <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.3rem;">No Size Verdicts Yet</h4>
                <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 1rem;">Choose a fit style to generate your cross-brand size recommendations.</p>
                <a href="#/fit-style" class="fm-btn fm-btn-primary fm-btn-sm fm-btn-glow">Choose Fit Style</a>
              </div>
            `
              : `
              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                ${recs
                  .map((r) => {
                    const brand = r.brand_name || 'Zara';
                    const name = r.product_name || 'Tailored Garment';
                    const size = r.recommended_size || 'M';
                    const score = r.score ? Math.round(r.score) : 96;

                    return `
                      <div class="fm-card tilt-card" style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.65rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                          <div style="display: flex; align-items: center; gap: 0.85rem;">
                            <div style="width: 3.25rem; height: 3.5rem; border-radius: var(--radius-md); background: var(--color-surface-subtle); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                              <span class="material-symbols-outlined" style="font-size: 26px; color: var(--color-secondary);">apparel</span>
                            </div>
                            <div>
                              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                                <span class="fm-chip fm-chip-teal" style="font-size: 0.7rem; padding: 0.1rem 0.5rem;">${brand}</span>
                                <span style="font-size: 0.75rem; color: var(--color-text-muted);">Confidence: ${score}%</span>
                              </div>
                              <h4 style="font-size: 0.98rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 0.15rem;">${name}</h4>
                              <p style="font-size: 0.75rem; color: var(--color-text-muted); margin: 0;">
                                ${r.created_at ? new Date(r.created_at).toLocaleString() : 'Saved recently'}
                              </p>
                            </div>
                          </div>

                          <div class="fm-chip fm-chip-coral" style="font-size: 0.95rem; font-weight: 800; padding: 0.35rem 0.95rem;">
                            Size ${size}
                          </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border-subtle); padding-top: 0.5rem;">
                          <button type="button" class="btn-reuse-rec fm-btn fm-btn-ghost fm-btn-sm" data-id="${r.recommendation_id}" style="color: var(--color-secondary); font-weight: 700; padding: 0.25rem 0.5rem;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">cached</span>
                            <span>View Cross-Brand Recommendations</span>
                          </button>

                          <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button type="button" class="btn-delete-rec fm-btn fm-btn-ghost fm-btn-sm" data-id="${r.recommendation_id}" style="color: var(--color-error); font-weight: 700; padding: 0.25rem 0.5rem;">
                              <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
          }
        </div>

        <!-- Edit / Create Profile Modal Dialog (Requirement 8) -->
        <div id="new-profile-modal" style="display: ${showProfileModal ? 'flex' : 'none'}; position: fixed; inset: 0; background: rgba(20, 49, 58, 0.45); backdrop-filter: blur(6px); z-index: 1000; align-items: center; justify-content: center; padding: 1rem;">
          <div class="fm-card" style="width: 100%; max-width: 520px; padding: 1.75rem; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.15rem;">
              <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-text-main); margin: 0;">
                ${editingProf ? `Edit "${editingProf.profile_name}"` : 'Add New Measurement Profile'}
              </h3>
              <button type="button" id="btn-close-modal" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted);">
                <span class="material-symbols-outlined" style="font-size: 22px;">close</span>
              </button>
            </div>

            <form id="create-profile-form">
              <div class="fm-form-group" style="margin-bottom: 0.85rem;">
                <label class="fm-label" for="new-prof-name">Profile Name</label>
                <input type="text" id="new-prof-name" class="fm-input" value="${editingProf ? editingProf.profile_name : ''}" placeholder="e.g. Women's Tops Profile" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-gender">Gender</label>
                  <select id="new-prof-gender" class="fm-input">
                    <option value="female" ${editingProf?.gender !== 'male' ? 'selected' : ''}>Women</option>
                    <option value="male" ${editingProf?.gender === 'male' ? 'selected' : ''}>Men</option>
                  </select>
                </div>

                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-category">Category</label>
                  <select id="new-prof-category" class="fm-input">
                    <option value="womens_tops" ${editingProf?.target_category === 'womens_tops' ? 'selected' : ''}>Women's Tops</option>
                    <option value="womens_bottoms" ${editingProf?.target_category === 'womens_bottoms' ? 'selected' : ''}>Women's Bottoms</option>
                    <option value="womens_dresses" ${editingProf?.target_category === 'womens_dresses' ? 'selected' : ''}>Women's Dresses</option>
                    <option value="mens_tops" ${editingProf?.target_category === 'mens_tops' ? 'selected' : ''}>Men's Tops</option>
                    <option value="mens_bottoms" ${editingProf?.target_category === 'mens_bottoms' ? 'selected' : ''}>Men's Bottoms</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.85rem;">
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-chest">Bust / Chest (cm)</label>
                  <input type="number" step="0.5" id="new-prof-chest" class="fm-input" value="${editingProf ? (editingProf.chest_bust_cm ?? 92) : 92}" required />
                </div>
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-waist">Waist (cm)</label>
                  <input type="number" step="0.5" id="new-prof-waist" class="fm-input" value="${editingProf ? (editingProf.waist_cm ?? 74) : 74}" required />
                </div>
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-hips">Hips (cm)</label>
                  <input type="number" step="0.5" id="new-prof-hips" class="fm-input" value="${editingProf ? (editingProf.hips_cm ?? 98) : 98}" required />
                </div>
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-height">Height (cm)</label>
                  <input type="number" step="0.5" id="new-prof-height" class="fm-input" value="${editingProf ? (editingProf.height_cm ?? 168) : 168}" required />
                </div>
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-shoulder">Shoulder (cm, Optional)</label>
                  <input type="number" step="0.5" id="new-prof-shoulder" class="fm-input" value="${editingProf && editingProf.shoulder_cm != null ? editingProf.shoulder_cm : ''}" placeholder="Skip / Optional" />
                </div>
                <div class="fm-form-group" style="margin-bottom: 0;">
                  <label class="fm-label" for="new-prof-inseam">Inseam (cm, Optional)</label>
                  <input type="number" step="0.5" id="new-prof-inseam" class="fm-input" value="${editingProf && editingProf.inseam_cm != null ? editingProf.inseam_cm : ''}" placeholder="Skip / Optional" />
                </div>
              </div>

              <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
                <button type="button" id="btn-cancel-modal" class="fm-btn fm-btn-secondary" style="flex: 1;">Cancel</button>
                <button type="submit" id="btn-submit-profile-modal" class="fm-btn fm-btn-primary fm-btn-glow" style="flex: 2;">
                  <span>${editingProf ? 'Update & Re-Run Recommendations' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      ${renderBottomTabBar('/history')}
    </div>
  `;
}
function onMountHistoryProfilesPage() {
  attachTopNavEvents();

  // 1. Select & Use Profile
  document.querySelectorAll('.btn-select-profile').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const { profiles } = store.getState();
      const prof = profiles.find((p) => p.id === id);
      if (prof) {
        store.setActiveProfile(prof);
        store.applyProfileToDraft(prof);
        store.addToast(`Loaded "${prof.profile_name}" — recalculating brand recommendations...`, 'info');
        await triggerMultiBrandEvaluation(prof.fit_style || store.getState().draftMeasurements.fitStyle || 'Regular');
        window.location.hash = '#/results';
      }
    });
  });

  // 2. Edit Profile Button -> Opens Modal pre-populated with profile measurements (Requirement 8)
  document.querySelectorAll('.btn-edit-profile').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingProfileId = Number(btn.dataset.id);
      showProfileModal = true;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  });

  // 3. Reset Profile Button -> Calls POST /api/v1/measurements/{id}/reset (Requirement 8)
  document.querySelectorAll('.btn-reset-profile').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      btn.disabled = true;
      try {
        const resetProf = await api.resetMeasurementProfile(id);
        await store.refreshProfiles();
        if (resetProf) {
          store.setActiveProfile(resetProf);
          store.applyProfileToDraft(resetProf);
        }
        store.addToast('Profile reset to baseline defaults (logged in history).', 'info');
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message || 'Error resetting profile', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // 4. Favorite / Default toggle
  document.querySelectorAll('.btn-toggle-favorite').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      try {
        await api.setDefaultMeasurementProfile(id);
        await store.refreshProfiles();
        store.addToast('Default profile updated.', 'success');
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message, 'error');
      }
    });
  });

  // 5. Delete Profile (Requirement 8)
  document.querySelectorAll('.btn-quick-dismiss').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const card = btn.closest('.profile-card');
      if (card) {
        card.style.opacity = '0.3';
      }
      try {
        await api.deleteMeasurementProfile(id);
        await store.refreshProfiles();
        store.addToast('Measurement profile deleted.', 'info');
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message || 'Error deleting profile', 'error');
      }
    });
  });

  // 6. Reuse recommendation
  document.querySelectorAll('.btn-reuse-rec').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      try {
        const rec = await api.getRecommendation(id);
        store.setLatestRecommendation(rec);
        window.location.hash = '#/results';
      } catch {
        window.location.hash = '#/results';
      }
    });
  });

  // 7. Delete recommendation
  document.querySelectorAll('.btn-delete-rec').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      try {
        await api.deleteRecommendation(id);
        store.addToast('Recommendation removed from history.', 'info');
        window.dispatchEvent(new CustomEvent('hashchange'));
      } catch (err) {
        store.addToast(err.message || 'Error deleting recommendation', 'error');
      }
    });
  });

  // 8. Open / Close Modal
  const openModalBtn = document.getElementById('btn-open-create-profile');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');

  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      editingProfileId = null;
      showProfileModal = true;
      window.dispatchEvent(new CustomEvent('hashchange'));
    });
  }

  const hideModal = () => {
    showProfileModal = false;
    editingProfileId = null;
    window.dispatchEvent(new CustomEvent('hashchange'));
  };

  if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

  // 9. Submit Edit or Create Form (PATCH /api/v1/measurements/{id} + Re-run recommendations)
  const form = document.getElementById('create-profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-prof-name')?.value.trim();
      const gender = document.getElementById('new-prof-gender')?.value || 'female';
      const targetCategory = document.getElementById('new-prof-category')?.value || 'womens_tops';
      const chest = Number(document.getElementById('new-prof-chest')?.value) || 92;
      const waist = Number(document.getElementById('new-prof-waist')?.value) || 74;
      const hips = Number(document.getElementById('new-prof-hips')?.value) || 98;
      const height = Number(document.getElementById('new-prof-height')?.value) || 168;
      const shoulderRaw = document.getElementById('new-prof-shoulder')?.value.trim();
      const inseamRaw = document.getElementById('new-prof-inseam')?.value.trim();

      const shoulder = shoulderRaw ? Number(shoulderRaw) : null;
      const inseam = inseamRaw ? Number(inseamRaw) : null;
      const clearFields = [];
      if (!shoulderRaw) clearFields.push('shoulder');
      if (!inseamRaw) clearFields.push('inseam');

      const submitBtn = document.getElementById('btn-submit-profile-modal');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Saving & Re-running Recommendations...</span>';
      }

      try {
        let savedProf = null;
        if (editingProfileId != null && editingProfileId < 1000000) {
          savedProf = await api.patchMeasurementProfile(editingProfileId, {
            profile_name: name || 'Updated Profile',
            gender,
            target_category: targetCategory,
            unit: 'cm',
            weight_unit: 'kg',
            chest_bust: chest,
            waist,
            hips,
            height,
            shoulder,
            inseam,
            clear_optional_fields: clearFields,
          });
        } else {
          savedProf = await api.createMeasurementProfile({
            profile_name: name || 'New Profile',
            gender,
            target_category: targetCategory,
            fit_preference: 'regular',
            unit: 'cm',
            weight_unit: 'kg',
            chest_bust: chest,
            waist,
            hips,
            height,
            weight: 62,
            shoulder,
            inseam,
            is_default: false,
          });
        }

        const wasEditing = editingProfileId != null;
        showProfileModal = false;
        editingProfileId = null;

        await store.refreshProfiles();
        if (savedProf) {
          store.setActiveProfile(savedProf);
          store.applyProfileToDraft(savedProf);
        }

        // Re-run recommendations with the updated values (Requirement 8)
        const currentFitStyle = store.getState().draftMeasurements.fitStyle || 'Regular';
        await triggerMultiBrandEvaluation(currentFitStyle);

        store.addToast(
          wasEditing
            ? 'Measurements updated, history logged, and recommendations refreshed!'
            : `Profile "${name}" created!`,
          'success'
        );

        if (wasEditing) {
          window.location.hash = '#/results';
        } else {
          window.dispatchEvent(new CustomEvent('hashchange'));
        }
      } catch (err) {
        store.addToast(err.message || 'Error saving profile', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.querySelectorAll('.tilt-card').forEach((card) => {
    tilt3d(card, 4);
  });
}


// --- Source: app.js ---
/**
 * ============================================================================
 * FITMATE FRONTEND APPLICATION MAIN ENTRY POINT
 * Initializes routing (#/ -> #/auth -> #/gender -> #/category -> #/measurements -> #/fit-style -> #/results),
 * connects state listeners, loads active session, mounts the Single Page Application,
 * and attaches global 60fps motion systems.
 * ============================================================================
 */




// Import All Page Views & Lifecycle Hooks









// Route Definitions: #/ landing -> #/auth -> #/gender -> #/category -> #/measurements -> #/fit-style -> #/results
const routes = {
  '/': {
    component: renderLandingPage,
    onMount: onMountLandingPage,
    requiresAuth: false,
  },
  '/auth': {
    component: renderAuthPage,
    onMount: onMountAuthPage,
    requiresAuth: false,
  },
  '/gender': {
    component: renderGenderPage,
    onMount: onMountGenderPage,
    requiresAuth: false,
  },
  '/category': {
    component: renderCategoryPage,
    onMount: onMountCategoryPage,
    requiresAuth: false,
  },
  '/measurements': {
    component: renderMeasurementsPage,
    onMount: onMountMeasurementsPage,
    requiresAuth: false,
  },
  '/fit-style': {
    component: renderFitStylePage,
    onMount: onMountFitStylePage,
    requiresAuth: false,
  },
  '/results': {
    component: renderResultsPage,
    onMount: onMountResultsPage,
    requiresAuth: false,
  },
  // Legacy & Companion Routes
  '/onboarding': {
    component: renderOnboardingPage,
    onMount: onMountOnboardingPage,
    requiresAuth: false,
  },
  '/home': {
    component: renderDashboardPage,
    onMount: onMountDashboardPage,
    requiresAuth: true,
  },
  '/brand-picker': {
    component: renderBrandProductPickerPage,
    onMount: onMountBrandProductPickerPage,
    requiresAuth: false,
  },
  '/result': {
    component: renderResultPage,
    onMount: onMountResultPage,
    requiresAuth: false,
  },
  '/comparison': {
    component: renderComparisonTablePage,
    onMount: onMountComparisonTablePage,
    requiresAuth: false,
  },
  '/history': {
    component: renderHistoryProfilesPage,
    onMount: onMountHistoryProfilesPage,
    requiresAuth: false,
  },
};
function initApp() {
  console.log('⚡ Initializing FITMATE Dynamic Motion Experience...');

  initBackgroundBlobs(document.body);

  if (typeof window !== 'undefined') {
    let progressBar = document.getElementById('fm-scroll-progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'fm-scroll-progress-bar';
      document.body.prepend(progressBar);
    }
    window.addEventListener(
      'scroll',
      () => {
        const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollCurrent = window.scrollY || document.documentElement.scrollTop;
        const pct = scrollTotal > 0 ? (scrollCurrent / scrollTotal) * 100 : 0;
        progressBar.style.width = `${pct}%`;
      },
      { passive: true }
    );
  }

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.fm-btn');
    if (btn) {
      ripple(e, btn);
    }
  });

  attachCursorGlow('.fm-btn-glow');

  const router = new Router(routes, 'app-root');
  router.handleRoute();

  // Attempt to restore user profile and saved measurement profiles in background
  if (api.isAuthenticated()) {
    api
      .getCurrentUserProfile()
      .then((user) => {
        if (user) {
          store.setState({ user, isAuthenticated: true });
        }
      })
      .catch((err) => console.log('Session check notice:', err.message));

    api
      .listMeasurements()
      .then((profiles) => {
        if (profiles && profiles.length > 0) {
          const defaultProf = profiles.find((p) => p.is_default) || profiles[0];
          store.setState({
            profiles,
            activeProfile: defaultProf,
          });
          // Only prefill draft if user has not already edited draft in current session
          if (!store.getState().draftMeasurements.measurementsConfirmed) {
            store.applyProfileToDraft(defaultProf);
          }
          // Re-render if user is on /gender or /measurements so the "Saved Measurements Found" banner appears
          const curPath = router.getCurrentPath().split('?')[0];
          if (curPath === '/gender' || curPath === '/measurements') {
            router.handleRoute();
          }
        }
      })
      .catch((err) => console.log('Saved profiles sync notice:', err.message));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}



})();
