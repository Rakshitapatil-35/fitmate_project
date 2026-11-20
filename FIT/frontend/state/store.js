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

import { api } from '../services/api.js';

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

export const store = new AppStore();
