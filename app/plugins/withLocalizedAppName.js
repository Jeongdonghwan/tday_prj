/**
 * 온디바이스 앱 표시명 로케일 분기 (글로벌 확장 Phase 1-4).
 *  ko 기기: "오늘연애" / 그 외(en): "TodayLoves".
 *
 * 관리형 Expo(android/ios 폴더 없음)라 prebuild 시점에 네이티브 산출물을 주입한다.
 * - Android: values/strings.xml(기본=en) + values-ko/strings.xml(app_name=오늘연애),
 *   AndroidManifest 의 android:label 을 @string/app_name 으로 치환.
 * - iOS: Info.plist CFBundleDisplayName 기본 + ko.lproj/InfoPlist.strings 로 지역화.
 *
 * 기본(base) 이름을 영어로 두어 미지원 로케일은 TodayLoves 로 표기(글로벌 기본).
 * 한국 기기만 values-ko / ko.lproj 로 "오늘연애" override → 기존 한국 유저 경험 무변경.
 */
const {
  withStringsXml,
  withAndroidManifest,
  withInfoPlist,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NAME_KO = '오늘연애';
const NAME_EN = 'TodayLoves';

/** Android: strings.xml(app_name=en 기본) + values-ko/strings.xml(ko) + manifest label 참조 */
function withAndroidLocalizedName(config) {
  // 1) 기본 strings.xml 에 app_name(en) 주입
  config = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ _: NAME_EN, $: { name: 'app_name', translatable: 'false' } }],
      cfg.modResults,
    );
    return cfg;
  });

  // 2) manifest 의 application android:label → @string/app_name
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:label'] = '@string/app_name';
    return cfg;
  });

  // 3) values-ko/strings.xml 생성(app_name=ko) — prebuild 산출 디렉터리에 직접 기록
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'values-ko');
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(
        path.join(resDir, 'strings.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="app_name" translatable="false">${NAME_KO}</string>\n</resources>\n`,
        'utf8',
      );
      return cfg;
    },
  ]);

  return config;
}

/** iOS: CFBundleDisplayName(en 기본) + ko.lproj/InfoPlist.strings(ko) + 지역화 등록 */
function withIosLocalizedName(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleDisplayName = NAME_EN;
    // 지역화 활성화 (여러 언어 번들 노출)
    const langs = new Set(cfg.modResults.CFBundleLocalizations || []);
    langs.add('en');
    langs.add('ko');
    cfg.modResults.CFBundleLocalizations = Array.from(langs);
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projName = cfg.modRequest.projectName;
      const lprojDir = path.join(cfg.modRequest.platformProjectRoot, projName, 'ko.lproj');
      fs.mkdirSync(lprojDir, { recursive: true });
      fs.writeFileSync(
        path.join(lprojDir, 'InfoPlist.strings'),
        `"CFBundleDisplayName" = "${NAME_KO}";\n"CFBundleName" = "${NAME_KO}";\n`,
        'utf8',
      );
      return cfg;
    },
  ]);

  return config;
}

module.exports = function withLocalizedAppName(config) {
  config = withAndroidLocalizedName(config);
  config = withIosLocalizedName(config);
  return config;
};
