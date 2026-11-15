"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // browser-dist/annotate.ts
  var ANNOTATE_DEFAULT_CLIENT_ID = "cf75e489e29d237d59ae3ce260638a73d19085a7a676a5bf62fddc61b3da7392";
  var ANNOTATE_BROKER_ORIGIN = "https://annotate-cursor-prorotoype-d2cc64.gitlab.io";
  var ISSUES_CACHE_KEY = "annotate_issues_cache_v1";
  var _GitLabAuth = class _GitLabAuth {
    constructor() {
      __publicField(this, "config");
      __publicField(this, "currentUser", null);
      // Auth states already exchanged, to avoid double-processing a single-use code
      __publicField(this, "processedAuthStates", /* @__PURE__ */ new Set());
      // Labels we've attempted to ensure exist this session
      __publicField(this, "ensuredLabels", /* @__PURE__ */ new Set());
      this.config = {
        gitlabHost: window.ANNOTATE_CONFIG?.gitlabHost || "https://gitlab.com",
        gitlabClientId: window.ANNOTATE_CONFIG?.gitlabClientId || ANNOTATE_DEFAULT_CLIENT_ID,
        gitlabProjectId: window.ANNOTATE_CONFIG?.gitlabProjectId || "YOUR_PROJECT_ID",
        gitlabRedirectUri: window.ANNOTATE_CONFIG?.gitlabRedirectUri,
        gitlabDeviceProxyUrl: window.ANNOTATE_CONFIG?.gitlabDeviceProxyUrl
      };
      this.handleOAuthCallback();
      this.loadCachedUser();
      window.addEventListener("message", this.handlePopupMessage.bind(this));
      window.addEventListener("storage", (event) => {
        if (event.key !== _GitLabAuth.TOKEN_KEY || !event.newValue) return;
        console.log("[Annotate] Auth token arrived from the sign-in window");
        this.loadCachedUser();
        this.ensureUserLoaded().finally(() => {
          window.dispatchEvent(new CustomEvent("annotate-auth-changed"));
        });
      });
    }
    async ensureUserLoaded() {
      const token = this.getToken();
      if (token && !this.currentUser) {
        console.log("[Annotate] Token found but no user cached, fetching user...");
        await this.ensureAccessToken();
        await this.fetchCurrentUser();
      }
    }
    get host() {
      return this.config.gitlabHost;
    }
    get projectId() {
      return this.config.gitlabProjectId;
    }
    get isConfigured() {
      return Boolean(this.config.gitlabClientId) && this.config.gitlabClientId !== "YOUR_GITLAB_CLIENT_ID" && Boolean(this.config.gitlabProjectId) && this.config.gitlabProjectId !== "YOUR_PROJECT_ID";
    }
    /**
     * Origin of the OAuth callback broker. postMessages relaying the auth code
     * are only trusted when they come from this origin.
     */
    get callbackOrigin() {
      try {
        return new URL(this.getRedirectUri()).origin;
      } catch {
        return "";
      }
    }
    getToken() {
      return localStorage.getItem(_GitLabAuth.TOKEN_KEY);
    }
    getTokenType() {
      const tokenType = localStorage.getItem(_GitLabAuth.TOKEN_TYPE_KEY);
      return tokenType === "pat" ? "pat" : "oauth";
    }
    hasDeviceFlowProxy() {
      return Boolean(this.config.gitlabDeviceProxyUrl);
    }
    isEmbedded() {
      return window.self !== window.top;
    }
    parentIsCrossOrigin() {
      if (!this.isEmbedded()) return false;
      try {
        void window.top?.location.origin;
        return false;
      } catch {
        return true;
      }
    }
    getApiHeaders(contentType) {
      const token = this.getToken();
      if (!token) return null;
      const headers = {};
      if (this.getTokenType() === "pat") {
        headers["PRIVATE-TOKEN"] = token;
      } else {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
      return headers;
    }
    setPatToken(token) {
      localStorage.setItem(_GitLabAuth.TOKEN_KEY, token.trim());
      localStorage.setItem(_GitLabAuth.TOKEN_TYPE_KEY, "pat");
      localStorage.removeItem(_GitLabAuth.VERIFIER_KEY);
      localStorage.removeItem(_GitLabAuth.STATE_KEY);
    }
    getLoginFailureMessage(reason) {
      switch (reason) {
        case "popup_blocked":
          return "Popup was blocked. Allow popups and try again.";
        case "embedded":
          return "Sign-in must open in a new window on GitLab Pages.";
        case "closed":
          return "Sign-in window was closed before completion.";
        case "timeout":
          return "Sign-in timed out. Press Open Sign-In to try again.";
        case "oauth_error":
          return "GitLab returned an OAuth error. Try signing in again.";
        case "not_configured":
          return "GitLab is not configured. Set gitlabProjectId first.";
        default:
          return "Not signed in to GitLab. Open sign-in to continue.";
      }
    }
    isAuthenticated() {
      return Boolean(this.getToken());
    }
    getUser() {
      return this.currentUser;
    }
    loadCachedUser() {
      const cached = localStorage.getItem(_GitLabAuth.USER_KEY);
      if (cached) {
        try {
          this.currentUser = JSON.parse(cached);
        } catch {
          this.currentUser = null;
        }
      }
    }
    persistOAuthTokens(payload) {
      if (!payload?.access_token) return false;
      localStorage.setItem(_GitLabAuth.TOKEN_KEY, payload.access_token);
      localStorage.setItem(_GitLabAuth.TOKEN_TYPE_KEY, "oauth");
      if (payload.refresh_token) {
        localStorage.setItem(_GitLabAuth.REFRESH_KEY, payload.refresh_token);
      }
      if (payload.expires_in) {
        const expiresAt = Date.now() + Number(payload.expires_in) * 1e3;
        localStorage.setItem(_GitLabAuth.EXPIRES_KEY, String(expiresAt));
      }
      return true;
    }
    isAccessTokenExpired() {
      const expires = localStorage.getItem(_GitLabAuth.EXPIRES_KEY);
      if (!expires) return false;
      return Date.now() >= Number(expires) - 60 * 1e3;
    }
    async refreshAccessToken() {
      const refresh = localStorage.getItem(_GitLabAuth.REFRESH_KEY);
      if (!refresh || this.getTokenType() === "pat") return false;
      try {
        const body = new URLSearchParams({
          client_id: this.config.gitlabClientId,
          grant_type: "refresh_token",
          refresh_token: refresh
        });
        const response = await fetch(`${this.config.gitlabHost}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        });
        if (!response.ok) return false;
        const data = await response.json();
        if (!data.access_token) return false;
        this.persistOAuthTokens(data);
        console.log("[Annotate] Access token refreshed");
        return true;
      } catch (err) {
        console.warn("[Annotate] Token refresh failed:", err);
        return false;
      }
    }
    async ensureAccessToken() {
      if (!this.getToken()) return false;
      if (this.getTokenType() === "pat") return true;
      if (this.isAccessTokenExpired()) {
        return await this.refreshAccessToken();
      }
      return true;
    }
    async validateSession() {
      if (!this.getToken()) return false;
      await this.ensureAccessToken();
      const ok = await this.fetchCurrentUser();
      if (ok) return true;
      if (this.getTokenType() === "oauth" && await this.refreshAccessToken()) {
        return await this.fetchCurrentUser();
      }
      return Boolean(this.getToken() && this.currentUser);
    }
    hasViewableFeedbackSession() {
      return this.isAuthenticated() || Boolean(localStorage.getItem(ISSUES_CACHE_KEY));
    }
    // =========================================================================
    // PKCE Helpers (RFC 7636)
    // =========================================================================
    /**
     * Generate a cryptographically random code verifier (43-128 chars)
     */
    generateCodeVerifier() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return this.base64UrlEncode(array);
    }
    /**
     * Generate code challenge from verifier using SHA-256 (S256 method)
     */
    async generateCodeChallenge(verifier) {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return this.base64UrlEncode(new Uint8Array(hash));
    }
    /**
     * Base64 URL encode (no padding, URL-safe characters)
     */
    base64UrlEncode(buffer) {
      const base64 = btoa(String.fromCharCode(...buffer));
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    // =========================================================================
    // OAuth Callback Handler
    // =========================================================================
    /**
     * Handle OAuth callback - extract authorization code from URL query params
     * Then exchange it for an access token using PKCE
     */
    async handleOAuthCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");
      if (error) {
        console.error("[Annotate] OAuth error:", error, urlParams.get("error_description"));
        this.cleanupUrl();
        return;
      }
      if (!code) return;
      console.log("[Annotate] OAuth code present in page URL (no-popup fallback)");
      await this.completeAuthFromCode(code, state || void 0);
      this.cleanupUrl();
    }
    /**
     * Complete the PKCE flow from an authorization code.
     *
     * Shared by the popup-relay path (code arrives via postMessage from the
     * callback broker) and the no-popup fallback (code arrives in this page's
     * URL). Validates state, exchanges the code for a token using the verifier
     * held in this origin's localStorage, then loads the user.
     */
    async completeAuthFromCode(code, state) {
      if (!code) return false;
      if (state) {
        if (this.processedAuthStates.has(state)) return false;
        this.processedAuthStates.add(state);
      }
      const savedState = localStorage.getItem(_GitLabAuth.STATE_KEY);
      if (!state || state !== savedState) {
        console.error("[Annotate] OAuth state mismatch - ignoring code (possible CSRF)");
        return false;
      }
      const codeVerifier = localStorage.getItem(_GitLabAuth.VERIFIER_KEY);
      if (!codeVerifier) {
        console.error("[Annotate] No code verifier found - cannot complete PKCE flow");
        return false;
      }
      try {
        const tokenPayload = await this.exchangeCodeForToken(code, codeVerifier);
        if (!tokenPayload?.access_token) return false;
        console.log("[Annotate] Token exchange successful");
        this.persistOAuthTokens(tokenPayload);
        localStorage.removeItem(_GitLabAuth.VERIFIER_KEY);
        localStorage.removeItem(_GitLabAuth.STATE_KEY);
        await this.fetchCurrentUser();
        window.dispatchEvent(new CustomEvent("annotate-auth-changed"));
        console.log("[Annotate] GitLab OAuth (callback broker) flow completed");
        this.closeAuthPopupIfNeeded();
        return true;
      } catch (err) {
        console.error("[Annotate] Token exchange failed:", err);
        return false;
      }
    }
    /**
     * Exchange authorization code for access token (PKCE token endpoint)
     */
    async exchangeCodeForToken(code, codeVerifier) {
      let redirectUri;
      try {
        redirectUri = this.getRedirectUri();
      } catch (err) {
        console.error("[Annotate] Failed to get redirect URI for token exchange:", err);
        throw err;
      }
      const body = new URLSearchParams({
        client_id: this.config.gitlabClientId,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      });
      console.log("[Annotate] ============ Token Exchange Starting ============");
      console.log("[Annotate] Token endpoint:", `${this.config.gitlabHost}/oauth/token`);
      console.log("[Annotate] Grant type:", "authorization_code");
      console.log("[Annotate] Redirect URI:", redirectUri);
      console.log("[Annotate] Code verifier length:", codeVerifier.length);
      console.log("[Annotate] =================================================");
      const response = await fetch(`${this.config.gitlabHost}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error("[Annotate] Token exchange error:", response.status, errorData);
        throw new Error(`Token exchange failed: ${response.status}`);
      }
      const data = await response.json();
      return data;
    }
    /**
     * Clean up OAuth params from URL
     */
    cleanupUrl() {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState(null, document.title, url.pathname + url.search);
    }
    /**
     * Handle postMessage from OAuth popup
     */
    async handlePopupMessage(event) {
      if (event.origin !== this.callbackOrigin) return;
      const data = event.data;
      if (data.type === "GITLAB_AUTH_CODE" && data.code) {
        console.log("[Annotate] Received OAuth code from callback broker");
        await this.completeAuthFromCode(data.code, data.state);
      }
    }
    /**
     * Origin of the hosted annotate.js script, when loaded from a <script src>.
     */
    getScriptOrigin() {
      const scripts = document.getElementsByTagName("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i]?.src;
        if (!src || !src.includes("annotate.js")) continue;
        try {
          return new URL(src).origin;
        } catch {
        }
      }
      return null;
    }
    isLocalDevOrigin(origin) {
      try {
        const host = new URL(origin).hostname;
        return host === "localhost" || host === "127.0.0.1";
      } catch {
        return false;
      }
    }
    /**
     * Resolve the OAuth broker origin used for redirect_uri.
     *
     * Always use the shared broker host for third-party prototypes (including
     * local /vendor/annotate.js copies). Only localhost dev may use its own
     * origin so http://localhost:PORT/ can be registered once on the OAuth app.
     */
    getBrokerOrigin() {
      const scriptOrigin = this.getScriptOrigin();
      if (scriptOrigin && this.isLocalDevOrigin(scriptOrigin)) {
        return scriptOrigin;
      }
      return ANNOTATE_BROKER_ORIGIN;
    }
    /**
     * The OAuth redirect URI sent to GitLab.
     *
     * Must EXACTLY match a URI registered on the shared OAuth application.
     * Default: broker origin with trailing slash (e.g. …gitlab.io/), NOT the
     * prototype page URL and NOT /callback.html unless explicitly configured.
     */
    getRedirectUri() {
      let uri;
      if (this.config.gitlabRedirectUri?.trim()) {
        uri = this.config.gitlabRedirectUri.trim();
      } else {
        uri = `${this.getBrokerOrigin().replace(/\/$/, "")}/`;
      }
      try {
        uri = new URL(uri).toString();
      } catch {
        throw new Error(`Invalid redirect URI: ${JSON.stringify(uri)}`);
      }
      if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
        throw new Error(`Redirect URI must be absolute: ${uri}`);
      }
      if (/\s/.test(uri)) {
        throw new Error(`Redirect URI contains whitespace: ${JSON.stringify(uri)}`);
      }
      console.log("[Annotate] OAuth redirect URI:", uri);
      return uri;
    }
    // =========================================================================
    // Login Flow (PKCE)
    // =========================================================================
    /**
     * Open GitLab OAuth popup with PKCE
     */
    openAuthWindow(url, target) {
      return window.open(url, target, "width=600,height=700,scrollbars=yes,resizable=yes");
    }
    closeAuthPopupIfNeeded() {
      try {
        if (sessionStorage.getItem("annotate_oauth_popup") !== "1" && window.name !== "annotate-oauth") return;
        sessionStorage.removeItem("annotate_oauth_popup");
        window.close();
      } catch (err) {
        console.warn("[Annotate] Could not close sign-in window:", err);
      }
    }
    /**
     * GitLab's sign-in page sends Cross-Origin-Opener-Policy: same-origin.
     * Once the popup hits that page, popup.closed becomes true even though the
     * window is still open, and window.opener is cleared. Waiting on
     * popup.closed aborts login immediately. The popup shares this origin's
     * localStorage, so completion shows up as a new access token instead.
     */
    waitForPopupAuth(tokenAtStart, attemptId) {
      return new Promise((resolve) => {
        let settled = false;
        const cleanup = () => {
          window.removeEventListener("annotate-auth-changed", onAuthChanged);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
        };
        const finish = (result) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };
        const superseded = () => attemptId !== this.loginAttemptId;
        const onAuthChanged = () => {
          if (superseded()) {
            finish({ ok: false, reason: "superseded" });
            return;
          }
          if (this.getToken() && this.getToken() !== tokenAtStart) finish({ ok: true });
        };
        window.addEventListener("annotate-auth-changed", onAuthChanged);
        const pollInterval = setInterval(() => {
          if (superseded()) {
            finish({ ok: false, reason: "superseded" });
            return;
          }
          const token = this.getToken();
          if (token && token !== tokenAtStart) {
            this.ensureUserLoaded().finally(() => finish({ ok: true }));
          }
        }, 400);
        const timeoutId = setTimeout(() => {
          if (superseded()) {
            finish({ ok: false, reason: "superseded" });
            return;
          }
          finish(this.isAuthenticated() ? { ok: true } : {
            ok: false,
            reason: "timeout",
            message: "Sign-in timed out. Finish in the GitLab window, or press Open Sign-In to try again."
          });
        }, 3 * 60 * 1000);
      });
    }
    async login(openInNewWindow = false, onProgress) {
      if (!this.isConfigured) {
        console.error("[Annotate] GitLab OAuth not configured. Set window.ANNOTATE_CONFIG");
        return { ok: false, reason: "not_configured" };
      }
      const attemptId = this.loginAttemptId = (this.loginAttemptId || 0) + 1;
      const target = openInNewWindow ? "_blank" : "annotate-oauth";
      const popup = this.openAuthWindow("about:blank", target);
      if (!popup) {
        console.error("[Annotate] Popup blocked");
        if (this.isEmbedded() || this.parentIsCrossOrigin()) {
          return {
            ok: false,
            reason: "embedded",
            requiresNewWindow: true,
            message: "Sign-in must open in a new window on GitLab Pages."
          };
        }
        return {
          ok: false,
          reason: "popup_blocked",
          message: "Popup blocked. Allow popups and try again."
        };
      }
      try {
        popup.name = "annotate-oauth";
        popup.sessionStorage.setItem("annotate_oauth_popup", "1");
      } catch (err) {
        console.warn("[Annotate] Could not mark OAuth popup:", err);
      }
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.buildState();
      let redirectUri;
      try {
        redirectUri = this.getRedirectUri();
      } catch (err) {
        console.error("[Annotate] Failed to get redirect URI:", err);
        try {
          popup.close();
        } catch {
        }
        alert(`OAuth configuration error: ${err instanceof Error ? err.message : String(err)}`);
        return { ok: false, reason: "failed", message: "OAuth redirect URI is invalid." };
      }
      let popupClosed = false;
      try {
        popupClosed = popup.closed;
      } catch {
        popupClosed = true;
      }
      if (popupClosed) {
        localStorage.removeItem(_GitLabAuth.VERIFIER_KEY);
        localStorage.removeItem(_GitLabAuth.STATE_KEY);
        return {
          ok: false,
          reason: "popup_blocked",
          message: "Popup blocked. Allow popups and try again."
        };
      }
      localStorage.setItem(_GitLabAuth.VERIFIER_KEY, codeVerifier);
      localStorage.setItem(_GitLabAuth.STATE_KEY, state);
      const authUrl = new URL(`${this.config.gitlabHost}/oauth/authorize`);
      authUrl.searchParams.set("client_id", this.config.gitlabClientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "api read_user");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      console.log("[Annotate] ============ OAuth PKCE Flow Starting ============");
      console.log("[Annotate] GitLab Host:", this.config.gitlabHost);
      console.log("[Annotate] Client ID:", this.config.gitlabClientId);
      console.log("[Annotate] Redirect URI:", redirectUri);
      console.log("[Annotate] Response Type:", "code (PKCE)");
      console.log("[Annotate] Scopes:", "api read_user");
      console.log("[Annotate] Code Challenge Method:", "S256");
      console.log("[Annotate] Full Auth URL:", authUrl.toString());
      console.log("[Annotate] ===================================================");
      try {
        popup.location.href = authUrl.toString();
        popup.focus?.();
      } catch (err) {
        console.error("[Annotate] Failed to navigate sign-in window:", err);
        try {
          popup.close();
        } catch {
        }
        return { ok: false, reason: "failed", message: "Could not open the GitLab sign-in window." };
      }
      onProgress?.("Finish signing in in the GitLab window. This panel updates automatically.");
      return this.waitForPopupAuth(this.getToken(), attemptId);
    }
    logout() {
      localStorage.removeItem(_GitLabAuth.TOKEN_KEY);
      localStorage.removeItem(_GitLabAuth.TOKEN_TYPE_KEY);
      localStorage.removeItem(_GitLabAuth.USER_KEY);
      localStorage.removeItem(_GitLabAuth.REFRESH_KEY);
      localStorage.removeItem(_GitLabAuth.EXPIRES_KEY);
      localStorage.removeItem(_GitLabAuth.VERIFIER_KEY);
      localStorage.removeItem(_GitLabAuth.STATE_KEY);
      localStorage.removeItem(ISSUES_CACHE_KEY);
      this.currentUser = null;
      console.log("[Annotate] Logged out of GitLab");
      window.dispatchEvent(new CustomEvent("annotate-auth-changed"));
    }
    generateState() {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return this.base64UrlEncode(array);
    }
    /**
     * Build the OAuth `state` value: a random CSRF nonce plus the return URL of
     * the page that initiated login. The callback broker reads the return URL to
     * know which origin to relay the auth code back to; this origin compares the
     * full state string on the way back to defeat CSRF.
     */
    buildState() {
      const payload = {
        n: this.generateState(),
        r: window.location.origin + window.location.pathname + window.location.search + window.location.hash
      };
      return btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    async startDeviceAuthorization() {
      const proxyUrl = this.config.gitlabDeviceProxyUrl?.trim();
      if (!proxyUrl) {
        return { ok: false, error: "Device flow proxy is not configured." };
      }
      try {
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            gitlabHost: this.config.gitlabHost,
            clientId: this.config.gitlabClientId,
            scope: "api read_user"
          })
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          return { ok: false, error: errText || `Device auth start failed (${response.status})` };
        }
        const data = await response.json();
        if (!data.device_code || !data.user_code || !data.verification_uri) {
          return { ok: false, error: "Device auth response is incomplete." };
        }
        return {
          ok: true,
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          verificationUriComplete: data.verification_uri_complete,
          deviceCode: data.device_code,
          interval: data.interval || 5,
          expiresIn: data.expires_in || 600
        };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Failed to start device auth." };
      }
    }
    async pollDeviceAuthorization(deviceCode, intervalSeconds = 5, expiresInSeconds = 600) {
      const startedAt = Date.now();
      const intervalMs = Math.max(intervalSeconds, 2) * 1e3;
      while (Date.now() - startedAt < expiresInSeconds * 1e3) {
        try {
          const body = new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            device_code: deviceCode,
            client_id: this.config.gitlabClientId
          });
          const response = await fetch(`${this.config.gitlabHost}/oauth/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });
          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload.access_token) {
            this.persistOAuthTokens(payload);
            await this.fetchCurrentUser();
            window.dispatchEvent(new CustomEvent("annotate-auth-changed"));
            return { ok: true };
          }
          if (payload.error === "authorization_pending") {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            continue;
          }
          if (payload.error === "slow_down") {
            await new Promise((resolve) => setTimeout(resolve, (payload.interval || intervalSeconds + 5) * 1e3));
            continue;
          }
          if (payload.error === "access_denied") {
            return { ok: false, reason: "failed", message: "Device authorization was denied." };
          }
          if (payload.error === "expired_token") {
            return { ok: false, reason: "failed", message: "Device authorization code expired." };
          }
          return {
            ok: false,
            reason: "failed",
            message: payload.error_description || payload.error || `Device token polling failed (${response.status}).`
          };
        } catch (error) {
          return { ok: false, reason: "failed", message: error instanceof Error ? error.message : "Device auth failed." };
        }
      }
      return { ok: false, reason: "failed", message: "Device authorization timed out." };
    }
    async fetchCurrentUser() {
      try {
        const headers = this.getApiHeaders();
        if (!headers) return false;
        const response = await fetch(`${this.config.gitlabHost}/api/v4/user`, {
          headers
        });
        if (response.status === 401 && this.getTokenType() === "oauth") {
          if (await this.refreshAccessToken()) {
            return this.fetchCurrentUser();
          }
          return false;
        }
        if (response.ok) {
          this.currentUser = await response.json();
          localStorage.setItem(_GitLabAuth.USER_KEY, JSON.stringify(this.currentUser));
          console.log(`[Annotate] Logged in as ${this.currentUser.name}`);
          return true;
        }
        return false;
      } catch (error) {
        console.error("[Annotate] Failed to fetch user:", error);
        return false;
      }
    }
    /**
     * Ensure a project label exists. Idempotent and best-effort.
     */
    async ensureLabel(name, color) {
      if (this.ensuredLabels.has(name)) return;
      this.ensuredLabels.add(name);
      const headers = this.getApiHeaders("application/json");
      if (!headers) return;
      const url = `${this.config.gitlabHost}/api/v4/projects/${encodeURIComponent(this.config.gitlabProjectId)}/labels`;
      try {
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ name, color })
        });
      } catch (err) {
        console.warn(`[Annotate] Could not pre-create label "${name}" (non-fatal):`, err);
      }
    }
    async ensureFeedbackLabel() {
      await this.ensureLabel("prototype-feedback", "#3B82F6");
    }
    async ensureDoneLabel() {
      await this.ensureLabel("status::done", "#22C55E");
    }
    /**
     * Upload a file to GitLab project uploads (for issue attachments).
     */
    async uploadFile(blob, filename) {
      const headers = this.getApiHeaders();
      if (!headers) {
        return { ok: false, error: "Not authenticated" };
      }
      const formData = new FormData();
      formData.append("file", blob, filename);
      const url = `${this.config.gitlabHost}/api/v4/projects/${encodeURIComponent(this.config.gitlabProjectId)}/uploads`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: formData
        });
        if (response.ok) {
          const data = await response.json();
          return { ok: true, markdown: data.markdown };
        }
        const errorData = await response.json().catch(() => ({}));
        return { ok: false, error: errorData.message || `Upload failed: ${response.status}` };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Upload failed" };
      }
    }
    /**
     * Close an issue and mark it done.
     */
    async resolveIssue(issueIid) {
      const headers = this.getApiHeaders("application/json");
      if (!headers) {
        return { success: false, error: "Not authenticated" };
      }
      await this.ensureDoneLabel();
      const url = `${this.config.gitlabHost}/api/v4/projects/${encodeURIComponent(this.config.gitlabProjectId)}/issues/${issueIid}`;
      try {
        const response = await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            state_event: "close",
            add_labels: "status::done"
          })
        });
        if (response.ok) {
          return { success: true };
        }
        if (response.status === 401 && await this.refreshAccessToken()) {
          return this.resolveIssue(issueIid);
        }
        if (response.status === 401) {
          return { success: false, error: "Session expired. Sign in again from the sidebar." };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || `API error: ${response.status}` };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Network error" };
      }
    }
    /**
     * Create a GitLab issue
     */
    async createIssue(payload, _retried = false) {
      await this.ensureAccessToken();
      const headers = this.getApiHeaders("application/json");
      if (!headers) {
        return { success: false, error: "Not authenticated" };
      }
      await this.ensureFeedbackLabel();
      const url = `${this.config.gitlabHost}/api/v4/projects/${encodeURIComponent(this.config.gitlabProjectId)}/issues`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const issue = await response.json();
          return { success: true, issueUrl: issue.web_url, iid: issue.iid };
        } else if (response.status === 401 && !_retried && await this.refreshAccessToken()) {
          return this.createIssue(payload, true);
        } else if (response.status === 401) {
          return { success: false, error: "Session expired. Sign in again from the sidebar." };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return { success: false, error: errorData.message || `API error: ${response.status}` };
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Network error" };
      }
    }
  };
  // Storage keys
  __publicField(_GitLabAuth, "TOKEN_KEY", "gl_access_token");
  __publicField(_GitLabAuth, "USER_KEY", "gl_user");
  __publicField(_GitLabAuth, "TOKEN_TYPE_KEY", "gl_access_token_type");
  __publicField(_GitLabAuth, "REFRESH_KEY", "gl_refresh_token");
  __publicField(_GitLabAuth, "EXPIRES_KEY", "gl_token_expires_at");
  // PKCE verifier uses localStorage (not sessionStorage) so popup can access it
  __publicField(_GitLabAuth, "VERIFIER_KEY", "gl_code_verifier");
  __publicField(_GitLabAuth, "STATE_KEY", "gl_oauth_state");
  var GitLabAuth = _GitLabAuth;
  var PENDING_SPOTLIGHT_KEY = "annotate_pending_spotlight";
  var AnnotateSidebar = class {
    // Track if user is typing a reply
    constructor(auth, onClose) {
      __publicField(this, "container", null);
      __publicField(this, "shadowRoot", null);
      __publicField(this, "auth");
      __publicField(this, "issues", []);
      __publicField(this, "isLoading", false);
      __publicField(this, "visible", false);
      __publicField(this, "spotlightOverlay", null);
      __publicField(this, "currentSpotlightElement", null);
      __publicField(this, "onCloseCallback", null);
      __publicField(this, "badgeContainer", null);
      __publicField(this, "hasActiveReplyInput", false);
      __publicField(this, "scrollHandler", null);
      __publicField(this, "commentModeActive", false);
      this.auth = auth;
      this.onCloseCallback = onClose || null;
      this.createSidebar();
      this.checkPendingSpotlight();
    }
    async checkPendingSpotlight() {
      const pendingIssueId = localStorage.getItem(PENDING_SPOTLIGHT_KEY);
      if (pendingIssueId) {
        localStorage.removeItem(PENDING_SPOTLIGHT_KEY);
        console.log("[Annotate] Found pending spotlight for issue:", pendingIssueId);
        await this.waitForDOMReady();
        await this.fetchIssues();
        setTimeout(() => {
          const issue = this.issues.find((i) => String(i.id) === pendingIssueId);
          if (issue) {
            this.show();
            this.showOnPage(issue);
          } else {
            console.warn("[Annotate] Pending issue not found after fetch:", pendingIssueId);
          }
        }, 800);
      }
    }
    waitForDOMReady() {
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          console.log("[Annotate] DOM already ready");
          resolve();
          return;
        }
        const observer = new MutationObserver(() => {
          if (document.readyState === "complete") {
            observer.disconnect();
            console.log("[Annotate] DOM ready detected via MutationObserver");
            resolve();
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          observer.disconnect();
          console.log("[Annotate] DOM ready timeout reached");
          resolve();
        }, 500);
      });
    }
    createSidebar() {
      this.container = document.createElement("div");
      this.container.id = "annotate-sidebar-host";
      this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      z-index: 100002;
      display: none;
    `;
      this.shadowRoot = this.container.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = this.getSidebarHTML();
      const style = document.createElement("style");
      style.textContent = this.getSidebarStyles();
      this.shadowRoot.prepend(style);
      document.body.appendChild(this.container);
      this.bindEvents();
    }
    getSidebarStyles() {
      return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .sidebar {
        width: 100%;
        height: 100%;
        background: #1e1e1e;
        border-left: 1px solid #333;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e0e0e0;
        font-size: 13px;
      }
      
      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #252526;
      }
      
      .sidebar-title {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .sidebar-actions {
        display: flex;
        gap: 8px;
      }
      
      .btn-icon {
        background: transparent;
        border: none;
        color: #858585;
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        font-size: 16px;
        line-height: 1;
        transition: all 0.15s;
      }
      
      .btn-icon:hover {
        background: #3c3c3c;
        color: #fff;
      }
      
      .btn-icon.spinning {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .btn-logout {
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: 1px solid #4a4a4a;
        color: #858585;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-family: inherit;
        transition: all 0.15s;
      }
      
      .btn-logout:hover {
        background: #3c3c3c;
        border-color: #5a5a5a;
        color: #fff;
      }
      
      .btn-logout svg {
        flex-shrink: 0;
      }
      
      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }
      
      .sidebar-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .sidebar-content::-webkit-scrollbar-track {
        background: #1e1e1e;
      }
      
      .sidebar-content::-webkit-scrollbar-thumb {
        background: #424242;
        border-radius: 4px;
      }
      
      .sidebar-content::-webkit-scrollbar-thumb:hover {
        background: #525252;
      }
      
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: #858585;
        gap: 12px;
      }
      
      .loading-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #333;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #858585;
      }
      
      .empty-state-icon {
        font-size: 32px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .login-prompt {
        text-align: center;
        padding: 40px 20px;
      }
      
      .login-prompt p {
        color: #858585;
        margin-bottom: 16px;
      }
      
      .btn-login {
        background: #fc6d26;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: background 0.15s;
      }
      
      .btn-login:hover {
        background: #e85d1a;
      }

      .sidebar-auth-input {
        width: 100%;
        padding: 8px;
        border-radius: 6px;
        border: 1px solid #4b5563;
        background: #1f2937;
        color: #fff;
      }

      .sidebar-auth-warning {
        margin-top: 10px;
        font-size: 12px;
        color: #f59e0b;
      }

      .sidebar-auth-error,
      .sidebar-auth-success {
        margin-top: 10px;
        font-size: 12px;
        border-radius: 6px;
        padding: 8px 10px;
      }

      .sidebar-auth-error {
        color: #fecaca;
        border: 1px solid #7f1d1d;
        background: #450a0a;
      }

      .sidebar-auth-success {
        color: #bbf7d0;
        border: 1px solid #166534;
        background: #052e16;
      }

      .sidebar-auth-success a {
        color: #86efac;
      }
      
      .card {
        background: #252526;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 10px;
        transition: border-color 0.15s;
      }
      
      .card:hover {
        border-color: #3b82f6;
      }
      
      .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .card-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .card-author {
        flex: 1;
        min-width: 0;
      }
      
      .card-author-name {
        font-weight: 500;
        color: #fff;
        font-size: 12px;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .card-date {
        font-size: 11px;
        color: #858585;
      }
      
      .card-comment {
        color: #d4d4d4;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 12px;
        word-wrap: break-word;
      }
      
      .card-file {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: #1e1e1e;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 11px;
        color: #9cdcfe;
        margin-bottom: 10px;
        overflow: hidden;
      }
      
      .card-file-icon {
        flex-shrink: 0;
      }
      
      .card-file-path {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .card-replies {
        margin: 12px 0;
        padding-top: 12px;
        border-top: 1px solid #333;
      }
      
      .card-reply {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px;
        background: #1e1e1e;
        border-radius: 6px;
      }
      
      .card-reply:last-child {
        margin-bottom: 0;
      }
      
      .reply-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .reply-content {
        flex: 1;
        min-width: 0;
      }
      
      .reply-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .reply-author {
        font-size: 11px;
        font-weight: 500;
        color: #d4d4d4;
      }
      
      .reply-date {
        font-size: 10px;
        color: #6b6b6b;
      }
      
      .reply-text {
        font-size: 12px;
        color: #a0a0a0;
        line-height: 1.4;
        word-wrap: break-word;
      }
      
      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .btn-action {
        flex: 1;
        background: #3c3c3c;
        border: 1px solid #4a4a4a;
        color: #d4d4d4;
        padding: 7px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s;
      }
      
      .btn-action:hover {
        background: #4a4a4a;
        border-color: #5a5a5a;
        color: #fff;
      }
      
      .btn-action.highlight {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
      }
      
      .btn-action.highlight:hover {
        background: #2563eb;
        border-color: #2563eb;
      }
      
      .btn-action.copied {
        background: #22c55e;
        border-color: #22c55e;
        color: #fff;
      }
      
      .btn-action.upvoted {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
      }
      
      .btn-action.upvoted:hover {
        background: #2563eb;
        border-color: #2563eb;
      }

      .btn-action.done {
        background: #166534;
        border-color: #166534;
        color: #fff;
      }

      .btn-action.done:hover {
        background: #15803d;
        border-color: #15803d;
      }
      
      .issue-count {
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .error-state {
        text-align: center;
        padding: 40px 20px;
        color: #f87171;
      }
      
      .error-state button {
        margin-top: 12px;
        background: #3c3c3c;
        border: 1px solid #4a4a4a;
        color: #d4d4d4;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      }
      
      @keyframes pulse-highlight {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      .pulse-element {
        animation: pulse-highlight 1s ease-out 3;
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px;
      }
      
      .btn-panel-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 1px solid #4a4a4a;
        border-radius: 6px;
        background: #2d2d2d;
        color: #c5c5c5;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
      }

      .btn-panel-toggle:hover {
        background: #3c3c3c;
        border-color: #6b6b6b;
        color: #fff;
      }

      .btn-panel-toggle:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .btn-panel-toggle svg {
        display: block;
        transform: rotate(90deg);
        transition: transform 0.2s ease;
      }

      .sidebar-comment-mode {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        border-bottom: 1px solid #1d4ed8;
        color: #fff;
        font-size: 12px;
        line-height: 1.35;
      }

      .sidebar-comment-mode[hidden] {
        display: none !important;
      }

      .sidebar-comment-mode__main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .sidebar-comment-mode__title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 13px;
      }

      .sidebar-comment-mode__hint {
        opacity: 0.92;
        font-size: 11px;
      }

      .sidebar-comment-mode__hint kbd {
        font-family: ui-monospace, monospace;
        background: rgba(255, 255, 255, 0.2);
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 10px;
      }

      .sidebar-comment-mode__user {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        opacity: 0.95;
        white-space: nowrap;
      }

      .sidebar-comment-mode__avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .sidebar-session-banner {
        margin: 0 12px 10px;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 11px;
        line-height: 1.4;
        color: #fde68a;
        background: #422006;
        border: 1px solid #92400e;
      }
      
      .sidebar-collapsed {
        width: 48px;
        height: 100%;
        background: #1e1e1e;
        border-left: 1px solid #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 12px;
      }
      
      .btn-expand {
        background: #252526;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 12px 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      }
      
      .btn-expand:hover {
        background: #3c3c3c;
        border-color: #3b82f6;
      }
      
      .collapsed-count {
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
      }
      
      .card-reply-form {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #333;
      }
      
      .reply-input {
        width: 100%;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        padding: 10px;
        color: #e0e0e0;
        font-size: 12px;
        font-family: inherit;
        resize: none;
        box-sizing: border-box;
      }
      
      .reply-input:focus {
        outline: none;
        border-color: #3b82f6;
      }
      
      .reply-input::placeholder {
        color: #6b6b6b;
      }
      
      .reply-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }
      
      .btn-reply-cancel {
        background: transparent;
        border: 1px solid #4a4a4a;
        color: #858585;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .btn-reply-cancel:hover {
        background: #3c3c3c;
        color: #d4d4d4;
      }
      
      .btn-reply-send {
        background: #3b82f6;
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
      }
      
      .btn-reply-send:hover {
        background: #2563eb;
      }
      
      .btn-reply-send:disabled {
        background: #3c3c3c;
        color: #6b6b6b;
        cursor: not-allowed;
      }
      
      /* Preview Modal */
      .preview-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100010;
        padding: 20px;
      }
      
      .preview-modal {
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 12px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .preview-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #333;
        background: #252526;
        border-radius: 12px 12px 0 0;
      }
      
      .preview-modal-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #fff;
      }
      
      .preview-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .preview-element-container {
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        overflow: auto;
        max-height: 300px;
        border: 2px solid #3b82f6;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
      }
      
      .preview-screenshot {
        max-width: 100%;
        max-height: 280px;
        object-fit: contain;
        border-radius: 4px;
      }
      
      .preview-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: #666;
        font-size: 12px;
      }
      
      .preview-comment-section {
        background: #252526;
        border-radius: 8px;
        padding: 16px;
      }
      
      .preview-author {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      
      .preview-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }
      
      .preview-author-name {
        font-weight: 500;
        color: #fff;
        display: block;
        font-size: 13px;
      }
      
      .preview-date {
        font-size: 11px;
        color: #858585;
      }
      
      .preview-comment-text {
        color: #d4d4d4;
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 12px 0;
      }
      
      .preview-file {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #858585;
      }
      
      .preview-file code {
        background: #1e1e1e;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, monospace;
        color: #9cdcfe;
      }
      
      .preview-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #333;
        background: #252526;
        border-radius: 0 0 12px 12px;
      }
      
      .btn-secondary {
        background: #3c3c3c;
        border: 1px solid #4a4a4a;
        color: #d4d4d4;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      }
      
      .btn-secondary:hover {
        background: #4a4a4a;
        color: #fff;
      }
      
      .btn-primary {
        background: #3b82f6;
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .btn-primary:hover {
        background: #2563eb;
      }
    `;
    }
    getSidebarHTML() {
      return `
      <div class="sidebar" id="sidebar-main">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <button type="button" class="btn-icon btn-panel-toggle" id="btn-collapse" title="Collapse sidebar" aria-label="Collapse sidebar" aria-expanded="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m11 17-5-5 5-5"/>
                <path d="m18 17-5-5 5-5"/>
              </svg>
            </button>
            <span>\u{1F4AC}</span>
            <span class="sidebar-title-text">Feedback</span>
            <span class="issue-count" id="issue-count">0</span>
          </div>
          <div class="sidebar-actions">
            <button class="btn-icon" id="btn-refresh" title="Refresh">\u21BB</button>
            <button class="btn-logout" id="btn-logout" title="Logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
            <button class="btn-icon" id="btn-close" title="Exit comment mode">\u2715</button>
          </div>
        </div>
        <div class="sidebar-comment-mode" id="sidebar-comment-mode" hidden>
          <div class="sidebar-comment-mode__main">
            <div class="sidebar-comment-mode__title">
              <span aria-hidden="true">\u{1F4DD}</span>
              <span>Comment mode</span>
            </div>
            <div class="sidebar-comment-mode__hint">Press <kbd>c</kbd> to exit</div>
          </div>
          <div class="sidebar-comment-mode__user" id="sidebar-comment-mode-user"></div>
        </div>
        <div id="sidebar-session-banner" class="sidebar-session-banner" hidden></div>
        <div class="sidebar-content" id="sidebar-content">
          <div class="loading">
            <div class="loading-spinner"></div>
            <span>Loading feedback...</span>
          </div>
        </div>
      </div>
      <div class="sidebar-collapsed" id="sidebar-collapsed" style="display: none;">
        <button class="btn-expand" id="btn-expand" title="Expand sidebar">
          <span>\u{1F4AC}</span>
          <span class="collapsed-count" id="collapsed-count">0</span>
        </button>
      </div>
    `;
    }
    bindEvents() {
      if (!this.shadowRoot) return;
      const refreshBtn = this.shadowRoot.getElementById("btn-refresh");
      refreshBtn?.addEventListener("click", () => this.fetchIssues());
      const closeBtn = this.shadowRoot.getElementById("btn-close");
      closeBtn?.addEventListener("click", () => {
        if (this.onCloseCallback) {
          this.onCloseCallback();
        } else {
          this.hide();
        }
      });
      const logoutBtn = this.shadowRoot.getElementById("btn-logout");
      logoutBtn?.addEventListener("click", () => {
        this.auth.logout();
        this.showToast("Logged out", "success");
        this.fetchIssues();
      });
      const collapseBtn = this.shadowRoot.getElementById("btn-collapse");
      collapseBtn?.addEventListener("click", () => this.collapse());
      const expandBtn = this.shadowRoot.getElementById("btn-expand");
      expandBtn?.addEventListener("click", () => this.expand());
      window.addEventListener("annotate-auth-changed", () => {
        console.log("[Annotate] Auth changed event received, refreshing sidebar");
        this.fetchIssues();
      });
    }
    updateAuthControls(isAuthenticated) {
      const logoutBtn = this.shadowRoot?.getElementById("btn-logout");
      const refreshBtn = this.shadowRoot?.getElementById("btn-refresh");
      if (logoutBtn) {
        logoutBtn.style.display = isAuthenticated ? "flex" : "none";
      }
      if (refreshBtn) {
        refreshBtn.style.display = isAuthenticated ? "inline-flex" : "none";
      }
    }
    collapse() {
      if (!this.shadowRoot || !this.container) return;
      const main = this.shadowRoot.getElementById("sidebar-main");
      const collapsed = this.shadowRoot.getElementById("sidebar-collapsed");
      if (main) main.style.display = "none";
      if (collapsed) collapsed.style.display = "flex";
      this.container.style.width = "48px";
      document.body.style.marginRight = "48px";
    }
    expand() {
      if (!this.shadowRoot || !this.container) return;
      const main = this.shadowRoot.getElementById("sidebar-main");
      const collapsed = this.shadowRoot.getElementById("sidebar-collapsed");
      if (main) main.style.display = "flex";
      if (collapsed) collapsed.style.display = "none";
      this.container.style.width = "380px";
      document.body.style.marginRight = "380px";
    }
    show() {
      if (!this.container) return;
      this.visible = true;
      this.container.style.display = "block";
      document.body.style.marginRight = "380px";
      document.body.style.transition = "margin-right 0.2s ease";
      this.setCommentModeActive(this.commentModeActive);
      this.fetchIssues();
      let scrollTimeout = null;
      this.scrollHandler = () => {
        if (scrollTimeout) return;
        scrollTimeout = window.setTimeout(() => {
          this.renderBadges();
          scrollTimeout = null;
        }, 100);
      };
      window.addEventListener("scroll", this.scrollHandler, { passive: true });
      window.addEventListener("resize", this.scrollHandler, { passive: true });
    }
    hide() {
      if (!this.container) return;
      this.visible = false;
      this.container.style.display = "none";
      document.body.style.marginRight = "0";
      this.clearBadges();
      if (this.scrollHandler) {
        window.removeEventListener("scroll", this.scrollHandler);
        window.removeEventListener("resize", this.scrollHandler);
        this.scrollHandler = null;
      }
    }
    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
    }
    renderBadges() {
      this.clearBadges();
      if (!this.visible || this.issues.length === 0) return;
      this.badgeContainer = document.createElement("div");
      this.badgeContainer.id = "annotate-badge-container";
      this.badgeContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99990;
    `;
      document.body.appendChild(this.badgeContainer);
      if (!document.getElementById("annotate-badge-styles")) {
        const style = document.createElement("style");
        style.id = "annotate-badge-styles";
        style.textContent = `
        .annotate-element-badge {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #3b82f6;
          border: 2px solid #fff;
          border-radius: 20px;
          padding: 3px 8px 3px 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          pointer-events: auto;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          z-index: 99991;
        }
        
        .annotate-element-badge:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        
        .annotate-element-badge img {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
        }
        
        .annotate-element-badge .badge-count {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
        }
        
        .annotate-card-highlight {
          background: #3c3c3c !important;
          outline: 2px solid #3b82f6;
        }
      `;
        document.head.appendChild(style);
      }
      const currentUrl = this.normalizeUrl(window.location.href);
      const issuesByElement = /* @__PURE__ */ new Map();
      for (const issue of this.issues) {
        const issueUrl = issue.metadata?.pageUrl;
        if (issueUrl && this.normalizeUrl(issueUrl) !== currentUrl) continue;
        const key = issue.metadata?.elementSelector || "";
        if (!key) continue;
        const existing = issuesByElement.get(key) || [];
        existing.push(issue);
        issuesByElement.set(key, existing);
      }
      for (const [selector, issues] of issuesByElement) {
        let element = null;
        const firstIssue = issues[0];
        if (firstIssue.metadata?.fingerprint) {
          element = this.findNode(firstIssue.metadata.fingerprint);
        }
        if (!element) {
          try {
            element = document.querySelector(selector);
          } catch (e) {
            continue;
          }
        }
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        const badge = document.createElement("div");
        badge.className = "annotate-element-badge";
        badge.style.left = `${rect.right - 30}px`;
        badge.style.top = `${rect.top - 10}px`;
        const primaryIssue = issues[0];
        const count = issues.length;
        badge.innerHTML = `
        <img src="${primaryIssue.author.avatar_url}" alt="${primaryIssue.author.name}" />
        ${count > 1 ? `<span class="badge-count">+${count - 1}</span>` : ""}
      `;
        badge.title = `${count} comment${count > 1 ? "s" : ""} by ${issues.map((i) => i.author.name).join(", ")}`;
        badge.addEventListener("click", () => {
          this.showOnPage(primaryIssue);
        });
        badge.addEventListener("mouseenter", () => {
          const card = this.shadowRoot?.querySelector(`[data-issue-id="${primaryIssue.id}"]`);
          card?.classList.add("annotate-card-highlight");
          card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        badge.addEventListener("mouseleave", () => {
          const card = this.shadowRoot?.querySelector(`[data-issue-id="${primaryIssue.id}"]`);
          card?.classList.remove("annotate-card-highlight");
        });
        this.badgeContainer.appendChild(badge);
      }
    }
    clearBadges() {
      if (this.badgeContainer) {
        this.badgeContainer.remove();
        this.badgeContainer = null;
      }
    }
    updateBadgesOnScroll() {
      if (!this.badgeContainer || !this.visible) return;
      this.renderBadges();
    }
    isVisible() {
      return this.visible;
    }
    hasCachedIssues() {
      return this.loadIssuesCache().length > 0;
    }
    loadIssuesCache() {
      try {
        const raw = localStorage.getItem(ISSUES_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    saveIssuesCache(issues) {
      try {
        localStorage.setItem(ISSUES_CACHE_KEY, JSON.stringify(issues));
      } catch (err) {
        console.warn("[Annotate] Could not cache issues:", err);
      }
    }
    setSessionBanner(message) {
      const banner = this.shadowRoot?.getElementById("sidebar-session-banner");
      if (!banner) return;
      if (!message) {
        banner.hidden = true;
        banner.textContent = "";
        return;
      }
      banner.hidden = false;
      banner.textContent = message;
    }
    setCommentModeActive(active) {
      this.commentModeActive = active;
      const bar = this.shadowRoot?.getElementById("sidebar-comment-mode");
      const userEl = this.shadowRoot?.getElementById("sidebar-comment-mode-user");
      if (bar) bar.hidden = !active;
      if (!userEl) return;
      const user = this.auth.getUser();
      if (active && user) {
        userEl.innerHTML = `
        <img src="${user.avatar_url}" alt="" class="sidebar-comment-mode__avatar" />
        <span>${this.escapeHtml(user.name)}</span>
      `;
      } else {
        userEl.innerHTML = "";
      }
    }
    renderCachedIssues(message) {
      const cached = this.loadIssuesCache();
      if (!cached.length) return false;
      this.issues = cached;
      this.setSessionBanner(message);
      this.renderIssues();
      this.renderBadges();
      return true;
    }
    prefetchIssues() {
      if (!this.auth.hasViewableFeedbackSession()) return;
      return this.fetchIssues();
    }
    async fetchIssues() {
      if (!this.shadowRoot) return;
      if (this.hasActiveReplyInput) {
        console.log("[Annotate] Skipping refresh - user is typing a reply");
        return;
      }
      const content = this.shadowRoot.getElementById("sidebar-content");
      const refreshBtn = this.shadowRoot.getElementById("btn-refresh");
      if (!content) return;
      const hasToken = this.auth.isAuthenticated();
      console.log("[Annotate] Sidebar fetchIssues - hasToken:", hasToken, "cached:", this.hasCachedIssues());
      this.updateAuthControls(hasToken);
      if (!hasToken) {
        this.setSessionBanner("");
        if (this.renderCachedIssues()) return;
        this.renderAuthRequiredState();
        return;
      }
      this.isLoading = true;
      refreshBtn?.classList.add("spinning");
      content.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>Loading feedback...</span>
      </div>
    `;
      try {
        await this.auth.ensureAccessToken();
        const headers = this.auth.getApiHeaders();
        const host = this.auth.host;
        const projectId = this.auth.projectId;
        const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues?labels=prototype-feedback&state=opened&per_page=50`;
        if (!headers) {
          throw new Error("Not signed in");
        }
        let response = await fetch(url, { headers });
        if (response.status === 401 && await this.auth.refreshAccessToken()) {
          const retryHeaders = this.auth.getApiHeaders();
          if (retryHeaders) {
            response = await fetch(url, { headers: retryHeaders });
          }
        }
        if (!response.ok) {
          if (response.status === 401) {
            if (this.renderCachedIssues("Session expired. Sign in again to sync \u2014 your last loaded comments are shown below.")) {
              return;
            }
            throw new Error("Session expired");
          }
          throw new Error(`API error: ${response.status}`);
        }
        this.setSessionBanner("");
        const issues = await response.json();
        this.issues = issues.map((issue) => this.parseIssue(issue));
        await Promise.all(
          this.issues.map(async (issue) => {
            issue.notes = await this.fetchIssueNotes(issue.iid);
            const upvoteData = await this.fetchIssueUpvotes(issue.iid);
            issue.upvotes = upvoteData.count;
            issue.userUpvoted = upvoteData.userVoted;
          })
        );
        this.saveIssuesCache(this.issues);
        this.renderIssues();
        this.renderBadges();
      } catch (error) {
        console.error("[Annotate] Failed to fetch issues:", error);
        if (this.renderCachedIssues("Could not reach GitLab. Showing your last loaded comments.")) {
          return;
        }
        const message = error instanceof Error && error.message === "Session expired" ? "Session expired. Sign in again to load feedback." : "Failed to load feedback";
        content.innerHTML = `
        <div class="error-state">
          <p>${this.escapeHtml(message)}</p>
          <button id="btn-retry">Try Again</button>
        </div>
      `;
        const retryBtn = this.shadowRoot.getElementById("btn-retry");
        retryBtn?.addEventListener("click", () => this.fetchIssues());
      } finally {
        this.isLoading = false;
        refreshBtn?.classList.remove("spinning");
      }
    }
    renderAuthRequiredState(message) {
      if (!this.shadowRoot) return;
      const content = this.shadowRoot.getElementById("sidebar-content");
      if (!content) return;
      const deviceAction = this.auth.hasDeviceFlowProxy() ? `<button class="btn-login" id="btn-sidebar-device" style="margin-top: 8px; background:#334155;">Use device code sign-in</button>` : "";
      content.innerHTML = `
      <div class="login-prompt">
        <p>Not signed in to GitLab.</p>
        <p style="font-size:12px; color:#9ca3af; margin-top:8px;">
          Recommended: use <strong>Open Sign-In</strong>. If your browser blocks popups or you're in a strict embed, use a Personal Access Token (PAT).
        </p>
        <button class="btn-login" id="btn-sidebar-login">
          \u{1F98A} Open Sign-In
        </button>
        ${this.auth.isEmbedded() ? `<button class="btn-login" id="btn-sidebar-login-new-window" style="margin-top: 8px;">Open in New Window</button>` : ""}
        <button class="btn-login" id="btn-sidebar-show-pat" style="margin-top: 8px; background:#4b5563;">Use Personal Access Token (PAT)</button>
        ${deviceAction}
        ${this.auth.isEmbedded() ? `<p class="sidebar-auth-warning">Sign-in must open in a new window on GitLab Pages.</p>` : ""}
        <div id="sidebar-auth-status">${message ? `<p class="sidebar-auth-error">${this.escapeHtml(message)}</p>` : ""}</div>
        <div id="sidebar-pat-form" style="display:none; margin-top:10px;">
          <p style="font-size:12px; color:#d1d5db; text-align:left; margin:0 0 8px 0;">
            What is PAT? A Personal Access Token is a GitLab token tied to your account.
            Create one in <strong>GitLab \u2192 User Settings \u2192 Access Tokens</strong> with <code>api</code> scope, then paste it below.
          </p>
          <input id="sidebar-pat-input" type="password" placeholder="Paste token here (starts with glpat-...)" class="sidebar-auth-input" />
          <button class="btn-login" id="btn-sidebar-save-pat" style="margin-top: 8px; background:#059669;">Use This Token</button>
        </div>
      </div>
    `;
      this.bindAuthRequiredActions();
    }
    bindAuthRequiredActions() {
      if (!this.shadowRoot) return;
      const statusEl = this.shadowRoot.getElementById("sidebar-auth-status");
      const setStatus = (msg, type = "error") => {
        if (!statusEl) return;
        const cls = type === "success" ? "sidebar-auth-success" : "sidebar-auth-error";
        statusEl.innerHTML = `<p class="${cls}">${this.escapeHtml(msg)}</p>`;
      };
      const loginBtn = this.shadowRoot.getElementById("btn-sidebar-login");
      loginBtn?.addEventListener("click", async () => {
        if (!loginBtn || loginBtn.disabled) return;
        const label = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = "Opening sign-in\u2026";
        const result = await this.auth.login(false, (msg) => {
          loginBtn.disabled = false;
          loginBtn.textContent = label;
          setStatus(msg, "success");
        });
        if (result.reason === "superseded") return;
        if (result.ok) {
          this.fetchIssues();
          return;
        }
        loginBtn.disabled = false;
        loginBtn.textContent = label;
        setStatus(result.message || this.auth.getLoginFailureMessage(result.reason));
      });
      const loginNewWindowBtn = this.shadowRoot.getElementById("btn-sidebar-login-new-window");
      loginNewWindowBtn?.addEventListener("click", async () => {
        if (!loginNewWindowBtn || loginNewWindowBtn.disabled) return;
        const label = loginNewWindowBtn.textContent;
        loginNewWindowBtn.disabled = true;
        loginNewWindowBtn.textContent = "Opening sign-in\u2026";
        const result = await this.auth.login(true, (msg) => {
          loginNewWindowBtn.disabled = false;
          loginNewWindowBtn.textContent = label;
          setStatus(msg, "success");
        });
        if (result.reason === "superseded") return;
        if (result.ok) {
          this.fetchIssues();
          return;
        }
        loginNewWindowBtn.disabled = false;
        loginNewWindowBtn.textContent = label;
        setStatus(result.message || this.auth.getLoginFailureMessage(result.reason));
      });
      const patToggleBtn = this.shadowRoot.getElementById("btn-sidebar-show-pat");
      const patForm = this.shadowRoot.getElementById("sidebar-pat-form");
      patToggleBtn?.addEventListener("click", () => {
        if (!patForm) return;
        patForm.style.display = patForm.style.display === "none" ? "block" : "none";
      });
      const savePatBtn = this.shadowRoot.getElementById("btn-sidebar-save-pat");
      savePatBtn?.addEventListener("click", async () => {
        const patInput = this.shadowRoot?.getElementById("sidebar-pat-input");
        const value = patInput?.value.trim() || "";
        if (!value) {
          setStatus("Paste a Personal Access Token with api scope.");
          return;
        }
        this.auth.setPatToken(value);
        const headers = this.auth.getApiHeaders();
        if (!headers) {
          setStatus("Could not store token.");
          return;
        }
        const response = await fetch(`${this.auth.host}/api/v4/user`, { headers }).catch(() => null);
        if (!response?.ok) {
          this.auth.logout();
          setStatus("Token is invalid or missing api scope. Create a new token and try again.");
          return;
        }
        setStatus("PAT accepted. Loading feedback...", "success");
        this.fetchIssues();
      });
      const deviceBtn = this.shadowRoot.getElementById("btn-sidebar-device");
      deviceBtn?.addEventListener("click", async () => {
        const start = await this.auth.startDeviceAuthorization();
        if (!start.ok || !start.deviceCode || !start.verificationUri || !start.userCode) {
          setStatus(start.error || "Unable to start device sign-in.");
          return;
        }
        const verifyLink = start.verificationUriComplete || start.verificationUri;
        if (statusEl) {
          statusEl.innerHTML = `
          <p class="sidebar-auth-success">
            1) Open <a href="${verifyLink}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(start.verificationUri)}</a><br/>
            2) Enter code <strong>${this.escapeHtml(start.userCode)}</strong><br/>
            3) Waiting for approval...
          </p>
        `;
        }
        const result = await this.auth.pollDeviceAuthorization(start.deviceCode, start.interval, start.expiresIn);
        if (result.ok) {
          this.fetchIssues();
        } else {
          setStatus(result.message || this.auth.getLoginFailureMessage(result.reason));
        }
      });
    }
    parseIssue(issue) {
      const parsed = { ...issue };
      try {
        const metadataMatch = issue.description?.match(
          /<!-- ANNOTATE_METADATA: (\{[\s\S]*?\}) -->/
        );
        if (metadataMatch?.[1]) {
          console.log("[Annotate] Parsing metadata for issue:", issue.id);
          const meta = JSON.parse(metadataMatch[1]);
          const descriptionLines = issue.description?.split("---")[0]?.trim() || "";
          const comment = descriptionLines || "";
          parsed.metadata = {
            elementSelector: meta.elementSelector || "",
            fingerprint: meta.fingerprint,
            filePath: meta.filePath || "",
            line: meta.line || 1,
            pageUrl: meta.pageUrl || "",
            comment
          };
          console.log("[Annotate] Parsed metadata:", {
            hasFingerprint: !!meta.fingerprint,
            selector: meta.elementSelector?.substring(0, 50),
            pageUrl: meta.pageUrl
          });
        } else {
          console.log("[Annotate] No metadata found in issue:", issue.id, "description starts with:", issue.description?.substring(0, 100));
        }
      } catch (e) {
        console.warn("[Annotate] Failed to parse issue metadata:", e, "for issue:", issue.id);
      }
      return parsed;
    }
    renderIssues() {
      if (!this.shadowRoot) return;
      const content = this.shadowRoot.getElementById("sidebar-content");
      const countEl = this.shadowRoot.getElementById("issue-count");
      const collapsedCountEl = this.shadowRoot.getElementById("collapsed-count");
      if (!content) return;
      const countStr = String(this.issues.length);
      if (countEl) countEl.textContent = countStr;
      if (collapsedCountEl) collapsedCountEl.textContent = countStr;
      if (this.issues.length === 0) {
        content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">\u{1F4ED}</div>
          <p>No feedback yet</p>
          <p style="font-size: 11px; margin-top: 8px;">
            Press 'c' and click on elements to leave feedback
          </p>
        </div>
      `;
        return;
      }
      content.innerHTML = this.issues.map((issue) => this.renderCard(issue)).join("");
      console.log("[Annotate] Binding handlers for", this.issues.length, "issues");
      this.issues.forEach((issue) => {
        const showBtn = this.shadowRoot?.getElementById(`show-${issue.id}`);
        const replyBtn = this.shadowRoot?.getElementById(`reply-${issue.id}`);
        const upvoteBtn = this.shadowRoot?.getElementById(`upvote-${issue.id}`);
        const doneBtn = this.shadowRoot?.getElementById(`done-${issue.id}`);
        const replyForm = this.shadowRoot?.getElementById(`reply-form-${issue.id}`);
        const replyInput = this.shadowRoot?.getElementById(`reply-input-${issue.id}`);
        const replyCancelBtn = this.shadowRoot?.getElementById(`reply-cancel-${issue.id}`);
        const replySendBtn = this.shadowRoot?.getElementById(`reply-send-${issue.id}`);
        console.log(`[Annotate] Issue ${issue.id}: showBtn=${!!showBtn}, replyBtn=${!!replyBtn}, upvoteBtn=${!!upvoteBtn}`);
        showBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("[Annotate] Locate button clicked for issue:", issue.id);
          this.showOnPage(issue);
        });
        upvoteBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          console.log("[Annotate] Upvote button clicked for issue:", issue.id);
          await this.toggleUpvote(issue);
        });
        doneBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          await this.markAsResolved(issue);
        });
        replyBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("[Annotate] Reply button clicked for issue:", issue.id);
          if (replyForm) {
            const isHidden = replyForm.style.display === "none";
            replyForm.style.display = isHidden ? "block" : "none";
            if (isHidden) replyInput?.focus();
          }
        });
        replyCancelBtn?.addEventListener("click", () => {
          if (replyForm) replyForm.style.display = "none";
          if (replyInput) replyInput.value = "";
          this.hasActiveReplyInput = false;
        });
        replyInput?.addEventListener("input", () => {
          if (replyInput.value.trim().length > 0) {
            this.hasActiveReplyInput = true;
            console.log("[Annotate] User started typing reply");
          } else {
            this.hasActiveReplyInput = false;
          }
        });
        replyInput?.addEventListener("blur", () => {
          if (!replyInput.value.trim()) {
            this.hasActiveReplyInput = false;
            console.log("[Annotate] Reply input cleared");
          }
        });
        replySendBtn?.addEventListener("click", async () => {
          const text = replyInput?.value?.trim();
          if (!text) return;
          replySendBtn.textContent = "Sending...";
          replySendBtn.disabled = true;
          const success = await this.postReply(issue.iid, text);
          if (success) {
            if (replyForm) replyForm.style.display = "none";
            if (replyInput) replyInput.value = "";
            this.hasActiveReplyInput = false;
            this.showToast("Reply sent!", "success");
            this.fetchIssues();
          } else {
            this.showToast("Failed to send reply", "error");
          }
          replySendBtn.textContent = "Send Reply";
          replySendBtn.disabled = false;
        });
      });
    }
    renderCard(issue) {
      const comment = issue.metadata?.comment || this.extractComment(issue.description);
      const filePath = issue.metadata?.filePath;
      const line = issue.metadata?.line || 1;
      const date = new Date(issue.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      const notesHtml = issue.notes && issue.notes.length > 0 ? `<div class="card-replies">
          ${issue.notes.map((note) => {
        const noteDate = new Date(note.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
        return `
              <div class="card-reply">
                <img src="${note.author.avatar_url}" alt="" class="reply-avatar" />
                <div class="reply-content">
                  <div class="reply-header">
                    <span class="reply-author">${note.author.name}</span>
                    <span class="reply-date">${noteDate}</span>
                  </div>
                  <div class="reply-text">${this.escapeHtml(note.body)}</div>
                </div>
              </div>
            `;
      }).join("")}
        </div>` : "";
      const replyCount = issue.notes?.length || 0;
      const replyBadge = replyCount > 0 ? ` (${replyCount})` : "";
      return `
      <div class="card" data-issue-id="${issue.id}">
        <div class="card-header">
          <img src="${issue.author.avatar_url}" alt="" class="card-avatar" />
          <div class="card-author">
            <span class="card-author-name">${issue.author.name}</span>
            <span class="card-date">${date}</span>
          </div>
        </div>
        <div class="card-comment">${this.escapeHtml(comment)}</div>
        ${filePath ? `
          <div class="card-file">
            <span class="card-file-icon">\u{1F4C4}</span>
            <span class="card-file-path">${filePath}:${line}</span>
          </div>
        ` : ""}
        ${notesHtml}
        <div class="card-actions">
          <button class="btn-action highlight" id="show-${issue.id}">
            <span>\u{1F4CD}</span> Locate
          </button>
          <button class="btn-action" id="reply-${issue.id}">
            <span>\u{1F4AC}</span> Reply${replyBadge}
          </button>
          <button class="btn-action ${issue.userUpvoted ? "upvoted" : ""}" id="upvote-${issue.id}" title="Upvote this feedback">
            <span>\u{1F44D}</span> +1${issue.upvotes ? ` (${issue.upvotes})` : ""}
          </button>
          <button class="btn-action done" id="done-${issue.id}" title="Mark as resolved">
            <span>\u2713</span> Done
          </button>
        </div>
        <div class="card-reply-form" id="reply-form-${issue.id}" style="display: none;">
          <textarea class="reply-input" id="reply-input-${issue.id}" placeholder="Write a reply..." rows="2"></textarea>
          <div class="reply-actions">
            <button class="btn-reply-cancel" id="reply-cancel-${issue.id}">Cancel</button>
            <button class="btn-reply-send" id="reply-send-${issue.id}">Send Reply</button>
          </div>
        </div>
      </div>
    `;
    }
    extractComment(description) {
      if (!description) return "";
      return description.replace(/<!-- ANNOTATE_METADATA:.*?-->/s, "").replace(/\*\*Comment:\*\*\s*/g, "").replace(/---[\s\S]*$/g, "").trim().split("\n")[0] || "";
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    normalizeUrl(url) {
      try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch {
        return url;
      }
    }
    async showOnPage(issue) {
      console.log("[Annotate] showOnPage called with issue:", issue.id);
      console.log("[Annotate] Issue metadata:", JSON.stringify(issue.metadata, null, 2));
      if (!issue.metadata) {
        console.error("[Annotate] No metadata found for issue");
        this.showToast("No element data found for this feedback", "error");
        return;
      }
      const issuePageUrl = issue.metadata?.pageUrl;
      const currentUrl = window.location.href;
      if (issuePageUrl && this.normalizeUrl(issuePageUrl) !== this.normalizeUrl(currentUrl)) {
        console.log("[Annotate] Comment is on different page, redirecting...");
        console.log("[Annotate] Issue page:", issuePageUrl);
        console.log("[Annotate] Current page:", currentUrl);
        localStorage.setItem(PENDING_SPOTLIGHT_KEY, String(issue.id));
        window.location.assign(issuePageUrl);
        return;
      }
      let element = null;
      if (issue.metadata?.fingerprint) {
        console.log("[Annotate] Trying fingerprint:", issue.metadata.fingerprint);
        element = this.findNode(issue.metadata.fingerprint);
      }
      if (!element && issue.metadata?.elementSelector) {
        console.log("[Annotate] Trying selector:", issue.metadata.elementSelector);
        try {
          element = document.querySelector(issue.metadata.elementSelector);
          if (element) {
            console.log("[Annotate] Found element by direct selector");
          }
        } catch (e) {
          console.warn("[Annotate] Selector query failed:", e);
        }
      }
      if (!element && issue.metadata?.filePath) {
        const srcAttr = `${issue.metadata.filePath}:${issue.metadata.line}`;
        console.log("[Annotate] Trying data-cursor-src:", srcAttr);
        element = document.querySelector(`[data-cursor-src="${srcAttr}"]`);
        if (element) {
          console.log("[Annotate] Found element by data-cursor-src");
        }
      }
      if (!element) {
        console.log("[Annotate] Element not found on page with any strategy");
        console.log("[Annotate] Available metadata:", {
          hasFingerprint: !!issue.metadata?.fingerprint,
          selector: issue.metadata?.elementSelector,
          filePath: issue.metadata?.filePath,
          pageUrl: issue.metadata?.pageUrl
        });
        this.showToast("Element not found on page", "error");
        return;
      }
      console.log("[Annotate] Found element:", element.tagName, element.className);
      this.showSpotlight(issue, element);
    }
    findNode(fingerprint) {
      console.log("[Annotate] findNode: Starting search with strategies...");
      console.log("[Annotate] Fingerprint:", fingerprint);
      try {
        const bySelector = document.querySelector(fingerprint.selector);
        if (bySelector) {
          console.log("[Annotate] \u2713 Strategy 1: Found element by exact selector");
          return bySelector;
        }
      } catch (e) {
        console.warn("[Annotate] \u2717 Strategy 1: Invalid selector", fingerprint.selector);
      }
      if (fingerprint.elementId) {
        const byId = document.getElementById(fingerprint.elementId);
        if (byId) {
          console.log("[Annotate] \u2713 Strategy 2: Found element by ID");
          this.showToast("Element found by ID (structure changed)", "warning");
          return byId;
        }
        console.warn("[Annotate] \u2717 Strategy 2: ID not found", fingerprint.elementId);
      }
      if (fingerprint.innerText && fingerprint.innerText.length > 3) {
        const searchText = fingerprint.innerText.toLowerCase();
        const candidates = Array.from(document.querySelectorAll(fingerprint.tagName));
        console.log(`[Annotate] Strategy 3: Searching ${candidates.length} <${fingerprint.tagName}> elements for text match`);
        for (const candidate of candidates) {
          const candidateText = candidate.innerText?.toLowerCase() || "";
          if (candidateText.includes(searchText) || searchText.includes(candidateText.substring(0, 20))) {
            if (fingerprint.className) {
              const candidateClasses = candidate.className || "";
              const fingerprintClassList = fingerprint.className.split(" ");
              const hasMatchingClass = fingerprintClassList.some((c) => candidateClasses.includes(c));
              if (hasMatchingClass) {
                console.log("[Annotate] \u2713 Strategy 3a: Found element by fuzzy text + class match");
                this.showToast("Element found by text match (nearby)", "warning");
                return candidate;
              }
            } else {
              console.log("[Annotate] \u2713 Strategy 3b: Found element by fuzzy text match");
              this.showToast("Element found by text match", "warning");
              return candidate;
            }
          }
        }
        console.warn("[Annotate] \u2717 Strategy 3: No text match found");
      }
      if (fingerprint.className) {
        const primaryClass = fingerprint.className.split(" ")[0];
        if (primaryClass) {
          try {
            const byClass = document.querySelector(`${fingerprint.tagName}.${CSS.escape(primaryClass)}`);
            if (byClass) {
              console.log("[Annotate] \u2713 Strategy 4: Found element by tag + primary class");
              this.showToast("Element moved or changed. Showing nearby context.", "warning");
              return byClass;
            }
          } catch (e) {
            console.warn("[Annotate] \u2717 Strategy 4: Class search failed:", e);
          }
        }
      }
      if (fingerprint.className) {
        const classes = fingerprint.className.split(" ").filter((c) => c.length > 0);
        for (const cls of classes) {
          try {
            const bySimilarClass = document.querySelector(`.${CSS.escape(cls)}`);
            if (bySimilarClass) {
              console.log(`[Annotate] \u2713 Strategy 5: Found element by similar class: ${cls}`);
              this.showToast("Element structure changed. Showing similar element.", "warning");
              return bySimilarClass;
            }
          } catch (e) {
          }
        }
        console.warn("[Annotate] \u2717 Strategy 5: No similar class found");
      }
      console.log("[Annotate] \u2717 All strategies failed: Element not found");
      return null;
    }
    showSpotlight(issue, element) {
      this.clearSpotlight();
      const comment = issue.metadata?.comment || this.extractComment(issue.description);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        this.spotlightOverlay = document.createElement("div");
        this.spotlightOverlay.className = "annotate-spotlight-overlay";
        this.spotlightOverlay.innerHTML = `
        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white"/>
              <rect 
                x="${rect.left - padding}" 
                y="${rect.top - padding}" 
                width="${rect.width + padding * 2}" 
                height="${rect.height + padding * 2}" 
                rx="8" 
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#spotlight-mask)"/>
        </svg>
        <div class="annotate-spotlight-bubble" style="
          position: absolute;
          top: ${rect.bottom + 12}px;
          left: ${Math.max(16, Math.min(rect.left, window.innerWidth - 320))}px;
        ">
          <div class="spotlight-bubble-pointer"></div>
          <div class="spotlight-bubble-content">
            <div class="spotlight-author">
              <img src="${issue.author.avatar_url}" alt="" class="spotlight-avatar" />
              <span class="spotlight-name">${issue.author.name}</span>
            </div>
            <p class="spotlight-comment">${this.escapeHtml(comment)}</p>
          </div>
        </div>
      `;
        this.spotlightOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99998;
        cursor: pointer;
      `;
        const style = document.createElement("style");
        style.textContent = `
        .annotate-spotlight-bubble {
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 12px;
          padding: 16px;
          max-width: 300px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: spotlightFadeIn 0.3s ease;
        }
        
        .spotlight-bubble-pointer {
          position: absolute;
          top: -8px;
          left: 24px;
          width: 16px;
          height: 16px;
          background: #1e1e1e;
          border-left: 1px solid #3c3c3c;
          border-top: 1px solid #3c3c3c;
          transform: rotate(45deg);
        }
        
        .spotlight-bubble-content {
          position: relative;
        }
        
        .spotlight-author {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .spotlight-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }
        
        .spotlight-name {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: #fff;
        }
        
        .spotlight-comment {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          color: #d4d4d4;
          line-height: 1.5;
          margin: 0;
        }
        
        @keyframes spotlightFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spotlightPulse {
          0%, 100% { 
            outline-color: #ff4757;
            outline-width: 3px;
          }
          50% { 
            outline-color: #ff6b81;
            outline-width: 5px;
          }
        }
        
        .annotate-spotlight-element {
          position: relative;
          z-index: 99999;
          outline: 3px solid #ff4757;
          outline-offset: 4px;
          border-radius: 4px;
          animation: spotlightPulse 2s ease-in-out infinite;
        }
      `;
        document.head.appendChild(style);
        document.body.appendChild(this.spotlightOverlay);
        element.classList.add("annotate-spotlight-element");
        this.currentSpotlightElement = element;
        this.spotlightOverlay.addEventListener("click", () => this.clearSpotlight());
        const handleEsc = (e) => {
          if (e.key === "Escape") {
            this.clearSpotlight();
            document.removeEventListener("keydown", handleEsc);
          }
        };
        document.addEventListener("keydown", handleEsc);
      }, 300);
    }
    clearSpotlight() {
      if (this.spotlightOverlay) {
        this.spotlightOverlay.remove();
        this.spotlightOverlay = null;
      }
      if (this.currentSpotlightElement) {
        this.currentSpotlightElement.classList.remove("annotate-spotlight-element");
        this.currentSpotlightElement = null;
      }
    }
    async showPreviewModal(issue, element) {
      if (!this.shadowRoot) return;
      const comment = issue.metadata?.comment || this.extractComment(issue.description);
      const filePath = issue.metadata?.filePath;
      const line = issue.metadata?.line || 1;
      const date = new Date(issue.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      const modal = document.createElement("div");
      modal.className = "preview-modal-backdrop";
      modal.id = "preview-modal";
      modal.innerHTML = `
      <div class="preview-modal">
        <div class="preview-modal-header">
          <div class="preview-modal-title">
            <span>\u{1F441}</span>
            <span>Feedback Preview</span>
          </div>
          <button class="btn-icon" id="preview-close">\u2715</button>
        </div>
        
        <div class="preview-modal-body">
          <div class="preview-element-container" id="preview-container">
            <div class="preview-loading">
              <div class="loading-spinner"></div>
              <span>Capturing screenshot...</span>
            </div>
          </div>
          
          <div class="preview-comment-section">
            <div class="preview-author">
              <img src="${issue.author.avatar_url}" alt="" class="preview-avatar" />
              <div>
                <span class="preview-author-name">${issue.author.name}</span>
                <span class="preview-date">${date}</span>
              </div>
            </div>
            <p class="preview-comment-text">${this.escapeHtml(comment)}</p>
            ${filePath ? `
              <div class="preview-file">
                <span>\u{1F4C4}</span>
                <code>${filePath}:${line}</code>
              </div>
            ` : ""}
          </div>
        </div>
        
        <div class="preview-modal-footer">
          <button class="btn-secondary" id="preview-cancel">Close</button>
          <button class="btn-primary" id="preview-goto">
            <span>\u2197</span> Go to Element
          </button>
        </div>
      </div>
    `;
      this.shadowRoot.appendChild(modal);
      const closeBtn = this.shadowRoot.getElementById("preview-close");
      const cancelBtn = this.shadowRoot.getElementById("preview-cancel");
      const gotoBtn = this.shadowRoot.getElementById("preview-goto");
      const closeModal = () => {
        modal.remove();
      };
      closeBtn?.addEventListener("click", closeModal);
      cancelBtn?.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
      gotoBtn?.addEventListener("click", () => {
        closeModal();
        this.collapse();
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("annotate-pulse-element");
          setTimeout(() => {
            element.classList.remove("annotate-pulse-element");
          }, 3e3);
        }, 100);
      });
      const container = this.shadowRoot.getElementById("preview-container");
      if (container) {
        try {
          console.log("[Annotate] Capturing screenshot of element...");
          const canvas = await this.captureElementScreenshot(element);
          container.innerHTML = "";
          if (canvas) {
            console.log("[Annotate] Screenshot captured successfully");
            const img = document.createElement("img");
            img.src = canvas.toDataURL("image/png");
            img.className = "preview-screenshot";
            img.alt = "Element screenshot";
            container.appendChild(img);
          } else {
            console.log("[Annotate] Screenshot failed, showing element info");
            this.showPreviewFallback(container, element);
          }
        } catch (err) {
          console.error("[Annotate] Screenshot error:", err);
          container.innerHTML = "";
          this.showPreviewFallback(container, element);
        }
      }
    }
    showPreviewFallback(container, element) {
      const tagName = element.tagName.toLowerCase();
      const className = element.className ? `.${element.className.split(" ").join(".")}` : "";
      const id = element.id ? `#${element.id}` : "";
      const text = element.textContent?.trim().substring(0, 100) || "";
      container.innerHTML = `
      <div style="
        text-align: center;
        padding: 20px;
        color: #666;
        font-size: 12px;
      ">
        <div style="
          font-size: 32px;
          margin-bottom: 12px;
          opacity: 0.5;
        ">\u{1F5BC}\uFE0F</div>
        <div style="
          font-family: monospace;
          background: #f0f0f0;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 8px;
          color: #333;
        ">&lt;${tagName}${id}${className}&gt;</div>
        ${text ? `<div style="color: #888; font-style: italic;">"${text}${text.length >= 100 ? "..." : ""}"</div>` : ""}
      </div>
    `;
    }
    /**
     * Load html2canvas dynamically and capture element screenshot
     */
    /**
     * Capture a screenshot of an element (used by comment modal and preview).
     */
    async captureScreenshot(element) {
      return this.captureElementScreenshot(element);
    }
    async captureElementScreenshot(element) {
      if (!window.html2canvas) {
        console.log("[Annotate] Loading html2canvas...");
        try {
          await this.loadHtml2Canvas();
          console.log("[Annotate] html2canvas loaded successfully");
        } catch (err) {
          console.error("[Annotate] Failed to load html2canvas:", err);
          return null;
        }
      }
      const html2canvas = window.html2canvas;
      if (!html2canvas) {
        console.warn("[Annotate] html2canvas not available after loading");
        return null;
      }
      try {
        console.log("[Annotate] Calling html2canvas on element:", element.tagName);
        const canvas = await html2canvas(element, {
          backgroundColor: "#ffffff",
          scale: 2,
          logging: true,
          // Enable logging for debugging
          useCORS: true,
          allowTaint: true
        });
        console.log("[Annotate] Canvas created:", canvas.width, "x", canvas.height);
        return canvas;
      } catch (error) {
        console.error("[Annotate] html2canvas failed:", error);
        return null;
      }
    }
    /**
     * Dynamically load html2canvas from CDN
     */
    loadHtml2Canvas() {
      return new Promise((resolve, reject) => {
        if (window.html2canvas) {
          resolve();
          return;
        }
        console.log("[Annotate] Creating script tag for html2canvas...");
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => {
          console.log("[Annotate] html2canvas script loaded");
          resolve();
        };
        script.onerror = (err) => {
          console.error("[Annotate] html2canvas script failed to load:", err);
          reject(new Error("Failed to load html2canvas"));
        };
        document.head.appendChild(script);
      });
    }
    /**
     * Post a reply comment to a GitLab issue
     */
    async postReply(issueIid, body) {
      const headers = this.auth.getApiHeaders("application/json");
      if (!headers) {
        this.showToast("Please login first", "error");
        return false;
      }
      const host = this.auth.host;
      const projectId = this.auth.projectId;
      const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ body })
        });
        if (response.ok) {
          return true;
        } else if (response.status === 401) {
          this.showToast("Session expired. Please login again.", "error");
          return false;
        } else {
          console.error("[Annotate] Failed to post reply:", response.status);
          return false;
        }
      } catch (error) {
        console.error("[Annotate] Error posting reply:", error);
        return false;
      }
    }
    async markAsResolved(issue) {
      const confirmed = window.confirm(`Mark feedback #${issue.iid} as done? This will close the GitLab issue.`);
      if (!confirmed) return;
      const doneBtn = this.shadowRoot?.getElementById(`done-${issue.id}`);
      if (doneBtn) {
        doneBtn.disabled = true;
        doneBtn.innerHTML = `<span>\u2026</span> Closing`;
      }
      const result = await this.auth.resolveIssue(issue.iid);
      if (result.success) {
        this.showToast(`Feedback #${issue.iid} marked as done`, "success");
        this.issues = this.issues.filter((i) => i.id !== issue.id);
        this.renderIssues();
        this.renderBadges();
      } else {
        this.showToast(result.error || "Failed to mark as done", "error");
        if (doneBtn) {
          doneBtn.disabled = false;
          doneBtn.innerHTML = `<span>\u2713</span> Done`;
        }
      }
    }
    async toggleUpvote(issue) {
      const headers = this.auth.getApiHeaders("application/json");
      const authHeaders = this.auth.getApiHeaders();
      if (!headers || !authHeaders) {
        this.showToast("Please login to vote", "error");
        return;
      }
      const host = this.auth.host;
      const projectId = this.auth.projectId;
      const issueiid = issue.iid;
      const upvoteBtn = this.shadowRoot?.getElementById(`upvote-${issue.id}`);
      if (!upvoteBtn) return;
      try {
        if (issue.userUpvoted) {
          const awardId = await this.findUserUpvoteId(issueiid);
          if (awardId) {
            const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueiid}/award_emoji/${awardId}`;
            const response = await fetch(url, {
              method: "DELETE",
              headers: authHeaders
            });
            if (response.ok || response.status === 204) {
              issue.userUpvoted = false;
              issue.upvotes = (issue.upvotes || 1) - 1;
              upvoteBtn.classList.remove("upvoted");
              upvoteBtn.innerHTML = `<span>\u{1F44D}</span> +1${issue.upvotes > 0 ? ` (${issue.upvotes})` : ""}`;
              this.showToast("Vote removed", "success");
              console.log("[Annotate] Removed upvote from issue:", issueiid);
            }
          }
        } else {
          const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueiid}/award_emoji`;
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: "thumbsup" })
          });
          if (response.ok) {
            issue.userUpvoted = true;
            issue.upvotes = (issue.upvotes || 0) + 1;
            upvoteBtn.classList.add("upvoted");
            upvoteBtn.innerHTML = `<span>\u{1F44D}</span> +1 (${issue.upvotes})`;
            this.showToast("Upvoted!", "success");
            console.log("[Annotate] Added upvote to issue:", issueiid);
          } else {
            const errorData = await response.json().catch(() => ({}));
            this.showToast(errorData.message || "Failed to vote", "error");
          }
        }
      } catch (error) {
        console.error("[Annotate] Error toggling upvote:", error);
        this.showToast("Failed to update vote", "error");
      }
    }
    async findUserUpvoteId(issueIid) {
      const headers = this.auth.getApiHeaders();
      if (!headers) return null;
      const host = this.auth.host;
      const projectId = this.auth.projectId;
      const currentUser = this.auth.getUser();
      if (!currentUser) return null;
      const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/award_emoji`;
      try {
        const response = await fetch(url, {
          headers
        });
        if (response.ok) {
          const awards = await response.json();
          const userThumbsup = awards.find((award) => award.name === "thumbsup" && award.user.id === currentUser.id);
          return userThumbsup?.id || null;
        }
        return null;
      } catch (error) {
        console.error("[Annotate] Error finding user upvote:", error);
        return null;
      }
    }
    async fetchIssueNotes(issueIid) {
      const headers = this.auth.getApiHeaders();
      if (!headers) return [];
      const host = this.auth.host;
      const projectId = this.auth.projectId;
      const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes?per_page=20`;
      try {
        const response = await fetch(url, {
          headers
        });
        if (response.ok) {
          const notes = await response.json();
          return notes.filter((note) => !note.system).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        return [];
      } catch (error) {
        console.error("[Annotate] Error fetching notes:", error);
        return [];
      }
    }
    async fetchIssueUpvotes(issueIid) {
      const headers = this.auth.getApiHeaders();
      if (!headers) return { count: 0, userVoted: false };
      const host = this.auth.host;
      const projectId = this.auth.projectId;
      const currentUser = this.auth.getUser();
      const url = `${host}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/award_emoji`;
      try {
        const response = await fetch(url, {
          headers
        });
        if (response.ok) {
          const awards = await response.json();
          const thumbsups = awards.filter((award) => award.name === "thumbsup");
          const userVoted = currentUser ? thumbsups.some((award) => award.user.id === currentUser.id) : false;
          return { count: thumbsups.length, userVoted };
        }
        return { count: 0, userVoted: false };
      } catch (error) {
        console.error("[Annotate] Error fetching upvotes:", error);
        return { count: 0, userVoted: false };
      }
    }
    showToast(message, type = "success") {
      const toast = document.createElement("div");
      const bg = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#f59e0b";
      toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bg};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 100001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3e3);
    }
  };
  var AnnotateCursor = class {
    constructor() {
      __publicField(this, "commentModeActive", false);
      __publicField(this, "overlay", null);
      __publicField(this, "highlightedElement", null);
      __publicField(this, "modal", null);
      __publicField(this, "auth");
      __publicField(this, "sidebar");
      this.auth = new GitLabAuth();
      this.sidebar = new AnnotateSidebar(this.auth, () => this.exitCommentMode());
      this.init();
    }
    exitCommentMode() {
      if (this.commentModeActive) {
        this.toggleCommentMode();
      }
    }
    init() {
      this.createStyles();
      this.createOverlay();
      this.bindKeyboard();
      this.bindClick();
      const authStatus = this.auth.isAuthenticated() ? `Logged in as ${this.auth.getUser()?.name || "user"}` : "Not logged in";
      console.log(`[Annotate] Initialized. Press 'c' to toggle comment mode. ${authStatus}`);
      this.auth.validateSession().finally(() => {
        if (this.auth.hasViewableFeedbackSession()) {
          this.sidebar.prefetchIssues();
        }
      });
    }
    createStyles() {
      const style = document.createElement("style");
      style.textContent = `
      .annotate-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 99998;
      }
      
      .annotate-overlay.active {
        pointer-events: auto;
        cursor: crosshair;
      }
      
      .annotate-highlight {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px;
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
      
      @keyframes annotate-pulse {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      .annotate-pulse-element {
        animation: annotate-pulse 1s ease-out 3 !important;
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px;
        position: relative;
        z-index: 1000;
      }
      
      .annotate-badge {
        position: fixed;
        top: 16px;
        right: 400px;
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: none;
        transition: right 0.2s ease;
      }
      
      .annotate-badge.active {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .annotate-badge-user {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        opacity: 0.9;
      }
      
      .annotate-badge-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
      }
      
      .annotate-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 420px;
        max-width: 90vw;
        z-index: 100000;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .annotate-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99999;
      }
      
      .annotate-modal h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .annotate-modal textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
      }
      
      .annotate-modal textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .annotate-modal-meta {
        margin-top: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        font-size: 12px;
        color: #6b7280;
      }
      
      .annotate-modal-meta code {
        background: #e5e7eb;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      
      .annotate-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      
      .annotate-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      
      .annotate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .annotate-btn-primary {
        background: #3b82f6;
        color: white;
      }
      
      .annotate-btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }
      
      .annotate-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      
      .annotate-btn-secondary:hover:not(:disabled) {
        background: #e5e7eb;
      }
      
      .annotate-btn-gitlab {
        background: #fc6d26;
        color: white;
      }
      
      .annotate-btn-gitlab:hover:not(:disabled) {
        background: #e24329;
      }
      
      .annotate-meta-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .annotate-meta-row:last-child {
        margin-bottom: 0;
      }
      
      .annotate-meta-row strong {
        flex-shrink: 0;
        min-width: 60px;
      }
      
      .annotate-meta-row code {
        word-break: break-all;
      }
      
      .annotate-source-found {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #059669;
      }
      
      .annotate-source-found code {
        background: #d1fae5;
        color: #065f46;
      }
      
      .annotate-source-missing {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #d97706;
        font-size: 11px;
      }
      
      .annotate-source-icon {
        font-size: 14px;
      }
      
      .annotate-login-prompt {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: center;
      }
      
      .annotate-login-prompt p {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #92400e;
      }

      .annotate-auth-input {
        width: 100%;
        padding: 8px;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        font-size: 13px;
      }
      
      .annotate-user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #f0fdf4;
        border: 1px solid #22c55e;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      
      .annotate-user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }
      
      .annotate-user-name {
        font-weight: 500;
        color: #166534;
      }
      
      .annotate-user-logout {
        margin-left: auto;
        font-size: 12px;
        color: #6b7280;
        cursor: pointer;
        text-decoration: underline;
      }
      
      .annotate-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: annotate-spin 0.8s linear infinite;
      }
      
      @keyframes annotate-spin {
        to { transform: rotate(360deg); }
      }
      
      .annotate-error {
        background: #fef2f2;
        border: 1px solid #ef4444;
        color: #b91c1c;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        margin-top: 12px;
      }
      
      .annotate-success {
        background: #f0fdf4;
        border: 1px solid #22c55e;
        color: #166534;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        margin-top: 12px;
      }
      
      .annotate-success a {
        color: #166534;
        font-weight: 500;
      }
    `;
      document.head.appendChild(style);
    }
    createOverlay() {
      const overlay = document.createElement("div");
      overlay.className = "annotate-overlay";
      document.body.appendChild(overlay);
      this.overlay = overlay;
    }
    updateBadge() {
      this.sidebar.setCommentModeActive(this.commentModeActive);
    }
    bindKeyboard() {
      document.addEventListener("keydown", (e) => {
        if (e.key === "c" && !this.isTyping(e.target)) {
          e.preventDefault();
          this.toggleCommentMode();
        }
        if (e.key === "Escape") {
          if (this.modal) {
            this.closeModal();
          } else if (this.commentModeActive) {
            this.toggleCommentMode();
          }
        }
      });
    }
    bindClick() {
      document.addEventListener("mousemove", (e) => {
        if (!this.commentModeActive || this.modal) return;
        const target = this.getElementUnderCursor(e.clientX, e.clientY);
        if (target) {
          this.highlightElement(target);
        }
      });
      document.addEventListener("click", (e) => {
        if (!this.commentModeActive || this.modal) return;
        const target = e.target;
        const sidebarHost = document.getElementById("annotate-sidebar-host");
        if (sidebarHost && (sidebarHost === target || sidebarHost.contains(target))) {
          return;
        }
        if (sidebarHost) {
          const rect = sidebarHost.getBoundingClientRect();
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = this.getElementUnderCursor(e.clientX, e.clientY);
        if (!clickedElement) return;
        const sourceInfo = this.findClosestSourceElement(clickedElement);
        this.openCommentModal(sourceInfo);
      }, true);
    }
    /**
     * Get the element under the cursor, ignoring the overlay and badge.
     * Temporarily disables pointer-events on overlay to find elements beneath.
     */
    getElementUnderCursor(x, y) {
      if (this.overlay) {
        this.overlay.style.pointerEvents = "none";
      }
      const elements = document.elementsFromPoint(x, y);
      if (this.overlay) {
        this.overlay.style.pointerEvents = "";
      }
      for (const el of elements) {
        if (el !== this.overlay && !el.classList.contains("annotate-badge") && !el.classList.contains("annotate-modal") && !el.classList.contains("annotate-modal-backdrop") && !el.closest(".annotate-modal") && !el.closest(".annotate-badge")) {
          return el;
        }
      }
      return null;
    }
    findClosestSourceElement(clickedElement) {
      let current = clickedElement;
      let foundOnElement = null;
      let filePath = "";
      let line = 1;
      while (current && current !== document.body) {
        const cursorSrc = current.getAttribute("data-cursor-src");
        if (cursorSrc) {
          foundOnElement = current;
          const colonIndex = cursorSrc.lastIndexOf(":");
          if (colonIndex > 0) {
            filePath = cursorSrc.substring(0, colonIndex);
            line = parseInt(cursorSrc.substring(colonIndex + 1), 10) || 1;
          } else {
            filePath = cursorSrc;
            line = 1;
          }
          break;
        }
        current = current.parentElement;
      }
      return { element: clickedElement, filePath, line, foundOnElement };
    }
    isTyping(target) {
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || target.isContentEditable;
    }
    toggleCommentMode() {
      this.commentModeActive = !this.commentModeActive;
      this.updateBadge();
      if (this.overlay) {
        this.overlay.classList.toggle("active", this.commentModeActive);
      }
      if (this.commentModeActive) {
        this.sidebar.show();
      } else {
        this.sidebar.hide();
        this.clearHighlight();
      }
      console.log(`[Annotate] Comment mode: ${this.commentModeActive ? "ON" : "OFF"}`);
    }
    highlightElement(element) {
      this.clearHighlight();
      element.classList.add("annotate-highlight");
      this.highlightedElement = element;
    }
    clearHighlight() {
      if (this.highlightedElement) {
        this.highlightedElement.classList.remove("annotate-highlight");
        this.highlightedElement = null;
      }
    }
    getElementFingerprint(element) {
      const selector = this.buildUniqueSelector(element);
      const innerText = (element.innerText || "").trim().substring(0, 50);
      const elementId = element.id || null;
      const tagName = element.tagName.toLowerCase();
      const className = typeof element.className === "string" ? element.className.split(" ").filter((c) => c && !c.startsWith("annotate-")).join(" ") : "";
      return { selector, innerText, elementId, tagName, className };
    }
    buildUniqueSelector(element) {
      if (element.id) {
        return `#${CSS.escape(element.id)}`;
      }
      const path = [];
      let current = element;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector = `#${CSS.escape(current.id)}`;
          path.unshift(selector);
          break;
        }
        if (current.className && typeof current.className === "string") {
          const classes = current.className.split(" ").filter((c) => c && !c.startsWith("annotate-")).slice(0, 2).map((c) => CSS.escape(c)).join(".");
          if (classes) {
            selector += `.${classes}`;
          }
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === current.tagName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join(" > ");
    }
    findNode(fingerprint) {
      try {
        const bySelector = document.querySelector(fingerprint.selector);
        if (bySelector) {
          console.log("[Annotate] findNode: Found element by selector");
          return bySelector;
        }
      } catch (e) {
        console.warn("[Annotate] findNode: Invalid selector", fingerprint.selector);
      }
      if (fingerprint.elementId) {
        const byId = document.getElementById(fingerprint.elementId);
        if (byId) {
          console.log("[Annotate] findNode: Found element by ID");
          return byId;
        }
      }
      if (fingerprint.innerText && fingerprint.innerText.length > 3) {
        const searchText = fingerprint.innerText.toLowerCase();
        const candidates = Array.from(document.querySelectorAll(fingerprint.tagName));
        for (const candidate of candidates) {
          const candidateText = candidate.innerText?.toLowerCase() || "";
          if (candidateText.includes(searchText) || searchText.includes(candidateText.substring(0, 20))) {
            if (fingerprint.className) {
              const candidateClasses = candidate.className || "";
              const fingerprintClassList = fingerprint.className.split(" ");
              const hasMatchingClass = fingerprintClassList.some((c) => candidateClasses.includes(c));
              if (hasMatchingClass) {
                console.log("[Annotate] findNode: Found element by fuzzy text + class match");
                return candidate;
              }
            } else {
              console.log("[Annotate] findNode: Found element by fuzzy text match");
              return candidate;
            }
          }
        }
      }
      if (fingerprint.className) {
        const primaryClass = fingerprint.className.split(" ")[0];
        if (primaryClass) {
          const byClass = document.querySelector(`${fingerprint.tagName}.${CSS.escape(primaryClass)}`);
          if (byClass) {
            console.log("[Annotate] findNode: Found element by tag + primary class");
            return byClass;
          }
        }
      }
      console.log("[Annotate] findNode: Element not found with any strategy");
      return null;
    }
    getElementSelector(element) {
      return this.buildUniqueSelector(element);
    }
    openCommentModal(sourceInfo) {
      const { element, filePath, line } = sourceInfo;
      const fingerprint = this.getElementFingerprint(element);
      const selector = fingerprint.selector;
      const hasSourceFile = Boolean(filePath);
      const isLoggedIn = this.auth.isAuthenticated();
      const user = this.auth.getUser();
      const backdrop = document.createElement("div");
      backdrop.className = "annotate-modal-backdrop";
      backdrop.onclick = () => this.closeModal();
      const sourceDisplay = hasSourceFile ? `<div class="annotate-source-found">
           <span class="annotate-source-icon">\u{1F4C4}</span>
           <code>${filePath}:${line}</code>
         </div>` : `<div class="annotate-source-missing">
           <span class="annotate-source-icon">\u26A0\uFE0F</span>
           <span>No <code>data-cursor-src</code> found</span>
         </div>`;
      let authSection = "";
      if (!isLoggedIn) {
        const deviceAction = this.auth.hasDeviceFlowProxy() ? `<button class="annotate-btn annotate-btn-secondary" id="annotate-device" style="margin-top:8px;">Use device code sign-in</button>` : "";
        authSection = `
        <div class="annotate-login-prompt">
          <p>Not signed in to GitLab.</p>
          <p style="font-size:12px; color:#92400e; margin: 0 0 12px 0;">
            Recommended: Open Sign-In. If popup/iframe rules block login, use a Personal Access Token (PAT).
          </p>
          <button class="annotate-btn annotate-btn-gitlab" id="annotate-login">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
            </svg>
            Open Sign-In
          </button>
          ${this.auth.isEmbedded() ? `<button class="annotate-btn annotate-btn-secondary" id="annotate-login-new-window" style="margin-top:8px;">Open in New Window</button>` : ""}
          <button class="annotate-btn annotate-btn-secondary" id="annotate-show-pat" style="margin-top:8px;">Use Personal Access Token (PAT)</button>
          ${deviceAction}
          ${this.auth.isEmbedded() ? `<div class="annotate-error" style="margin-top:10px;">Sign-in must open in a new window on GitLab Pages.</div>` : ""}
          <div id="annotate-pat-form" style="display:none; margin-top:10px;">
            <p style="font-size:12px; color:#92400e; text-align:left; margin: 0 0 8px 0;">
              Create a token in <strong>GitLab \u2192 User Settings \u2192 Access Tokens</strong>, enable <code>api</code> scope, copy it once, and paste it here.
            </p>
            <input id="annotate-pat-input" type="password" placeholder="Paste token here (starts with glpat-...)" class="annotate-auth-input" />
            <button class="annotate-btn annotate-btn-secondary" id="annotate-save-pat" style="margin-top:8px;">Use This Token</button>
          </div>
        </div>
      `;
      } else if (user) {
        authSection = `
        <div class="annotate-user-info">
          <img src="${user.avatar_url}" alt="" class="annotate-user-avatar" />
          <span class="annotate-user-name">${user.name}</span>
          <span class="annotate-user-logout" id="annotate-logout">Logout</span>
        </div>
      `;
      }
      const modal = document.createElement("div");
      modal.className = "annotate-modal";
      modal.innerHTML = `
      <h3>Add Feedback</h3>
      ${authSection}
      <textarea 
        id="annotate-comment" 
        placeholder="Describe the issue or suggestion..."
        ${!isLoggedIn ? "disabled" : ""}
      ></textarea>
      <div class="annotate-modal-meta">
        <div class="annotate-meta-row">
          <strong>Source:</strong>
          ${sourceDisplay}
        </div>
        <div class="annotate-meta-row">
          <strong>Element:</strong>
          <code>${selector}</code>
        </div>
        <div class="annotate-meta-row">
          <strong>Page:</strong>
          <span>${window.location.pathname}</span>
        </div>
      </div>
      <div id="annotate-status"></div>
      <div class="annotate-modal-actions">
        <button class="annotate-btn annotate-btn-secondary" id="annotate-cancel">Cancel</button>
        <button class="annotate-btn annotate-btn-primary" id="annotate-submit" ${!isLoggedIn ? "disabled" : ""}>
          Submit to GitLab
        </button>
      </div>
    `;
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      this.modal = modal;
      const textarea = modal.querySelector("#annotate-comment");
      const submitBtn = modal.querySelector("#annotate-submit");
      const statusDiv = modal.querySelector("#annotate-status");
      if (isLoggedIn) {
        setTimeout(() => textarea?.focus(), 50);
      }
      const setStatus = (msg, type = "error") => {
        statusDiv.innerHTML = `<div class="${type === "error" ? "annotate-error" : "annotate-success"}">${this.escapeHtml(msg)}</div>`;
      };
      modal.querySelector("#annotate-login")?.addEventListener("click", async () => {
        const loginBtn = modal.querySelector("#annotate-login");
        if (!loginBtn || loginBtn.disabled) return;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="annotate-spinner"></span> Opening sign-in\u2026';
        const result = await this.auth.login(false, (msg) => {
          loginBtn.disabled = false;
          loginBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
          </svg>
          Open Sign-In
        `;
          setStatus(msg, "success");
        });
        if (result.reason === "superseded") return;
        if (result.ok) {
          this.closeModal();
          this.openCommentModal(sourceInfo);
          this.updateBadge();
        } else {
          loginBtn.disabled = false;
          loginBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
          </svg>
          Open Sign-In
        `;
          setStatus(result.message || this.auth.getLoginFailureMessage(result.reason));
        }
      });
      modal.querySelector("#annotate-login-new-window")?.addEventListener("click", async () => {
        const result = await this.auth.login(true);
        if (result.ok) {
          this.closeModal();
          this.openCommentModal(sourceInfo);
          this.updateBadge();
        } else {
          setStatus(this.auth.getLoginFailureMessage(result.reason));
        }
      });
      modal.querySelector("#annotate-show-pat")?.addEventListener("click", () => {
        const form = modal.querySelector("#annotate-pat-form");
        if (!form) return;
        form.style.display = form.style.display === "none" ? "block" : "none";
      });
      modal.querySelector("#annotate-save-pat")?.addEventListener("click", async () => {
        const patInput = modal.querySelector("#annotate-pat-input");
        const value = patInput?.value.trim() || "";
        if (!value) {
          setStatus("Paste a Personal Access Token with api scope.");
          return;
        }
        this.auth.setPatToken(value);
        const headers = this.auth.getApiHeaders();
        if (!headers) {
          setStatus("Could not store token.");
          return;
        }
        const response = await fetch(`${this.auth.host}/api/v4/user`, { headers }).catch(() => null);
        if (!response?.ok) {
          this.auth.logout();
          setStatus("Token is invalid or missing api scope. Create a new token and try again.");
          return;
        }
        this.closeModal();
        this.openCommentModal(sourceInfo);
        this.updateBadge();
      });
      modal.querySelector("#annotate-device")?.addEventListener("click", async () => {
        const start = await this.auth.startDeviceAuthorization();
        if (!start.ok || !start.deviceCode || !start.verificationUri || !start.userCode) {
          setStatus(start.error || "Unable to start device sign-in.");
          return;
        }
        const verifyLink = start.verificationUriComplete || start.verificationUri;
        statusDiv.innerHTML = `
        <div class="annotate-success">
          1) Open <a href="${verifyLink}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(start.verificationUri)}</a><br/>
          2) Enter code <strong>${this.escapeHtml(start.userCode)}</strong><br/>
          3) Waiting for approval...
        </div>
      `;
        const result = await this.auth.pollDeviceAuthorization(start.deviceCode, start.interval, start.expiresIn);
        if (result.ok) {
          this.closeModal();
          this.openCommentModal(sourceInfo);
          this.updateBadge();
        } else {
          setStatus(result.message || this.auth.getLoginFailureMessage(result.reason));
        }
      });
      modal.querySelector("#annotate-logout")?.addEventListener("click", () => {
        this.auth.logout();
        this.closeModal();
        this.openCommentModal(sourceInfo);
        this.updateBadge();
      });
      modal.querySelector("#annotate-cancel")?.addEventListener("click", () => {
        this.closeModal();
      });
      const handleSubmit = async () => {
        const comment = textarea?.value.trim();
        if (!comment) {
          textarea?.focus();
          return;
        }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="annotate-spinner"></span> Capturing screenshot...';
        statusDiv.innerHTML = "";
        let screenshotMarkdown;
        try {
          const canvas = await this.sidebar.captureScreenshot(element);
          if (canvas) {
            const blob = await new Promise(
              (resolve) => canvas.toBlob(resolve, "image/png")
            );
            if (blob) {
              submitBtn.innerHTML = '<span class="annotate-spinner"></span> Uploading screenshot...';
              const upload = await this.auth.uploadFile(blob, `annotate-${Date.now()}.png`);
              if (upload.ok && upload.markdown) {
                screenshotMarkdown = upload.markdown;
                console.log("[Annotate] Screenshot uploaded for issue");
              } else {
                console.warn("[Annotate] Screenshot upload failed (non-fatal):", upload.error);
              }
            }
          }
        } catch (err) {
          console.warn("[Annotate] Screenshot capture failed (non-fatal):", err);
        }
        submitBtn.innerHTML = '<span class="annotate-spinner"></span> Submitting...';
        const metadata = {
          elementSelector: selector,
          fingerprint,
          filePath,
          line,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        const gitlabPayload = this.prepareGitLabPayload(comment, metadata, screenshotMarkdown);
        const result = await this.auth.createIssue(gitlabPayload);
        if (result.success) {
          statusDiv.innerHTML = `
          <div class="annotate-success">
            \u2713 Issue created! <a href="${result.issueUrl}" target="_blank">View in GitLab</a>
          </div>
        `;
          submitBtn.innerHTML = "\u2713 Submitted";
          this.sidebar.fetchIssues();
          setTimeout(() => {
            this.closeModal();
            this.showToast("Feedback submitted to GitLab");
          }, 1500);
        } else {
          statusDiv.innerHTML = `<div class="annotate-error">${result.error}</div>`;
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Submit to GitLab";
        }
      };
      submitBtn.addEventListener("click", handleSubmit);
      textarea?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && isLoggedIn) {
          e.preventDefault();
          handleSubmit();
        }
      });
    }
    prepareGitLabPayload(comment, metadata, screenshotMarkdown) {
      const sourceRef = metadata.filePath ? `at ${metadata.filePath}:${metadata.line}` : `on ${metadata.pageUrl}`;
      const titleComment = comment.length > 60 ? comment.substring(0, 57) + "..." : comment;
      const title = `[Feedback] ${sourceRef} - ${titleComment}`;
      const fileLink = metadata.filePath ? `**File:** \`${metadata.filePath}:${metadata.line}\`` : "_No source file linked_";
      const screenshotSection = screenshotMarkdown ? `

### Screenshot

${screenshotMarkdown}` : "";
      const description = `${comment}

---

### Annotation Details

${fileLink}

**Page URL:** ${metadata.pageUrl}

**Element:** \`${metadata.elementSelector}\`

**User Agent:** ${metadata.userAgent}

**Captured:** ${metadata.timestamp}${screenshotSection}

<!-- ANNOTATE_METADATA: ${JSON.stringify(metadata)} -->`;
      return {
        title,
        description,
        labels: "prototype-feedback"
      };
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    closeModal() {
      const backdrop = document.querySelector(".annotate-modal-backdrop");
      backdrop?.remove();
      this.modal?.remove();
      this.modal = null;
      this.clearHighlight();
    }
    showToast(message, type = "success") {
      const toast = document.createElement("div");
      const bg = type === "success" ? "#22c55e" : "#ef4444";
      toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bg};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 100001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3e3);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new AnnotateCursor());
  } else {
    new AnnotateCursor();
  }
})();
