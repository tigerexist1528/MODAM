const fs = require("fs");
const path = require("path");
const glob = require("glob");
const JavaScriptObfuscator = require("javascript-obfuscator");

// 빌드된 JS 파일들이 있는 경로
const buildDir = path.join(__dirname, "build", "static", "js");

console.log("🚀 난독화 시작: 빌드된 파일을 스캔합니다...");

// .js 파일만 찾아서 난독화 진행
glob(`${buildDir}/**/*.js`, (err, files) => {
  if (err) {
    console.error("❌ 파일 찾기 실패:", err);
    return;
  }

  files.forEach((file) => {
    // 이미 난독화된 파일이나 청크 파일 중 일부는 제외할 수도 있지만,
    // 보통은 전체를 다 난독화합니다.
    console.log(` - 처리 중: ${path.basename(file)}`);

    const code = fs.readFileSync(file, "utf8");

    // ★ 난독화 옵션 설정 (너무 강력하게 하면 성능이 느려질 수 있어 적당한 'High' 옵션 적용)
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true, // 로직 흐름 꼬기
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true, // 가짜 코드 심기
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false, // 개발자 도구 켰을 때 멈추게 할지 (오류 날 수 있어 끔)
      disableConsoleOutput: true, // console.log 지우기 (보안상 좋음)
      identifierNamesGenerator: "hexadecimal", // 변수명을 16진수로 변경 (_0xabc...)
      log: false,
      numbersToExpressions: true, // 숫자를 수식으로 변경 (10 -> 5+5)
      renameGlobals: false,
      rotateStringArray: true,
      selfDefending: true, // 코드 변조 시 작동 중지
      stringArray: true, // 문자열을 배열로 추출
      stringArrayEncoding: ["base64", "rc4"],
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
    });

    // 난독화된 코드로 파일 덮어쓰기
    fs.writeFileSync(file, obfuscationResult.getObfuscatedCode());
  });

  console.log("✅ 난독화 완료! 코드가 안전하게 보호되었습니다.");
});
