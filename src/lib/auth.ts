// This is a simple, non-secure authentication mechanism for demonstration purposes.
// Do not use this in a production environment.

"use client";

const CORRECT_PIN = '1234'; // WARNING: Hardcoded PIN
const AUTH_KEY = 'meditrack_auth';

export const login = (pin: string): boolean => {
  if (pin === CORRECT_PIN) {
    // Using localStorage to persist authentication across browser sessions
    // so users don't need to enter PIN every time
    try {
      localStorage.setItem(AUTH_KEY, 'true');
      return true;
    } catch (error) {
      console.error("Could not set local storage:", error);
      return false;
    }
  }
  return false;
};

export const logout = (): void => {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error("Could not remove local storage item:", error);
  }
};

export const isAuthenticated = (): boolean => {
  try {
    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch (error) {
    console.error("Could not read from local storage:", error);
    return false;
  }
};
