'use strict';

/**
 * Simple in-memory cache.
 * Stores { data, updatedAt, error } per key.
 */

const store = {};

function get(key) {
  return store[key] || null;
}

function set(key, data, error = null) {
  store[key] = {
    data: data || (store[key] && store[key].data) || null,
    updatedAt: new Date().toISOString(),
    error: error || null,
  };
}

/**
 * Update cache, keeping previous data intact when the new fetch fails.
 */
function update(key, data, error = null) {
  if (error && store[key]) {
    // keep previous data, just update the error and timestamp
    store[key] = {
      ...store[key],
      updatedAt: new Date().toISOString(),
      error,
    };
  } else {
    set(key, data, error);
  }
}

function all() {
  return { ...store };
}

module.exports = { get, set, update, all };
