/**
 * Daily Gambit — rotation helpers
 *
 * Reads each rotation pool from /src/data/daily/*.json and picks today's entry
 * via `dayOfYear mod pool.length`. Same logic for every rotating box.
 *
 * Drop this file at: /src/utils/daily-rotation.ts
 */

import archivesData from '../data/daily/archives.json';
import bookExcerptsData from '../data/daily/book-excerpts.json';
import openingsData from '../data/daily/openings.json';
import playersData from '../data/daily/players.json';
import whatIsData from '../data/daily/what-is.json';
import quotesData from '../data/daily/quotes.json';
import thisWeekData from '../data/daily/this-week.json';

/**
 * Get day-of-year (1–366) for a given date, in America/New_York time.
 * Using ET avoids the UTC build / ET edition drift (task #207).
 */
export function getDayOfYearET(date: Date = new Date()): number {
  // Convert to ET. America/New_York handles DST automatically.
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const start = new Date(et.getFullYear(), 0, 0);
  const diff = et.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Pick today's entry from any rotation pool.
 * Repeats safely once the year exceeds the pool length.
 */
export function pickByDay<T>(pool: T[], date: Date = new Date()): T {
  if (!pool || pool.length === 0) {
    throw new Error('pickByDay: pool is empty');
  }
  return pool[getDayOfYearET(date) % pool.length];
}

/**
 * Pick today's entry from a rotation pool, with fallback support.
 * If today's entry has a `fallbackTile` field (no photo available),
 * the consumer is expected to render the tile instead of the photo.
 */
export function pickByDayWithFallback<T extends { fallbackTile?: unknown }>(
  pool: T[],
  date: Date = new Date()
): T {
  return pickByDay(pool, date);
}

// ============================================================
// Per-box accessors. Use these in /src/pages/daily.astro.
// ============================================================

/** BOX 4 — From the Archives (historical figures, 97 entries) */
export function getDailyArchive(date?: Date) {
  return pickByDayWithFallback(archivesData.archives, date);
}

/** From the Book widget (Mourad's manuscript, 26 entries for June) */
export function getDailyBookExcerpt(date?: Date) {
  return pickByDay(bookExcerptsData.excerpts, date);
}

/** SLOT 6a — Opening Spotlight (100 entries) */
export function getDailyOpening(date?: Date) {
  return pickByDay(openingsData.openings, date);
}

/** BOX 3 — Player Profile (100 entries) */
export function getDailyPlayer(date?: Date) {
  return pickByDay(playersData.players, date);
}

/** BOX 5 — What Is...? (30 entries) */
export function getDailyWhatIs(date?: Date) {
  return pickByDay(whatIsData.concepts, date);
}

/** BOX 6 — Quote of the Day (180 entries) */
export function getDailyQuote(date?: Date) {
  return pickByDay(quotesData.quotes, date);
}

// ============================================================
// Weekly rotations (separate logic — by week-of-year not day)
// ============================================================

/**
 * Get week-of-year (1–53) for a given date, in ET.
 * Used for weekly slots: Games of the Week + This Week in Chess History.
 */
export function getWeekOfYearET(date: Date = new Date()): number {
  const dayOfYear = getDayOfYearET(date);
  return Math.floor(dayOfYear / 7);
}

export function pickByWeek<T>(pool: T[], date: Date = new Date()): T {
  if (!pool || pool.length === 0) {
    throw new Error('pickByWeek: pool is empty');
  }
  return pool[getWeekOfYearET(date) % pool.length];
}

/** This Week in Chess History — 52 weeks of date-anchored events */
export function getDailyThisWeek(date?: Date) {
  return pickByWeek(thisWeekData.weeks, date);
}

// ============================================================
// Edition metadata
// ============================================================

/**
 * Format today's edition date for the masthead.
 * Returns: "MONDAY, JUNE 1, 2026"
 */
export function getMastheadDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

/**
 * Determine edition stamp from the current ET hour.
 * 5am–4pm → Morning Edition
 * 4pm–5am → Evening Edition
 */
export function getEditionStamp(date: Date = new Date()): string {
  const etHour = Number(
    date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    })
  );
  return etHour >= 5 && etHour < 16 ? 'Morning Edition' : 'Evening Edition';
}

/**
 * Edition slug for routing: 2026-06-01-evening
 */
export function getEditionSlug(date: Date = new Date()): string {
  const isoDate = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const stamp = getEditionStamp(date) === 'Morning Edition' ? 'morning' : 'evening';
  return `${isoDate}-${stamp}`;
}
