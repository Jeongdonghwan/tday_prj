/** i18n 초기화 (글로벌 확장 Phase 1-4).
 *  기기 로케일로 초기 언어 결정 → 로그인 후 user.lang 로 override(setAppLang).
 *  ko 가 기본/폴백 — 기존 한국 유저 경험 무변경. */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ko from './locales/ko.json';

export type AppLang = 'ko' | 'en';

/** 기기 로케일 → 지원 언어('ko'|'en'). ko 로 시작하면 ko, 그 외 en. */
export function deviceLang(): AppLang {
  const tag = (getLocales()[0]?.languageCode ?? '').toLowerCase();
  return tag.startsWith('ko') ? 'ko' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: deviceLang(),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** 유저 언어권으로 앱 언어 동기화 (로그인/전환 시 호출). */
export function setAppLang(lang: AppLang) {
  if (i18n.language !== lang) i18n.changeLanguage(lang);
}

export default i18n;
