// This is a simple, non-secure authentication mechanism for demonstration purposes.
// Do not use this in a production environment.

"use client";

const CORRECT_PIN = '1234'; // WARNING: Hardcoded PIN
const AUTH_KEY = 'meditrack_auth';

export const login = (pin: string): boolean => {
  if (pin === CORRECT_PIN) {
    // In a real app, you'd use a more secure session management method.
    // sessionStorage is used here for simplicity. It clears when the browser tab is closed.
    try {
      sessionStorage.setItem(AUTH_KEY, 'true');
      return true;
    } catch (error) {
      console.error("Could not set session storage:", error);
      return false;
    }
  }
  return false;
};

export const logout = (): void => {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error("Could not remove session storage item:", error);
  }
};

export const isAuthenticated = (): boolean => {
  try {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  } catch (error) {
    console.error("Could not read from session storage:", error);
    return false;
  }
};
