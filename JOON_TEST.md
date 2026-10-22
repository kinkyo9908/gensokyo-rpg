# 조온 NPC 격리 테스트 복사본

이 브랜치는 웹 배포를 하지 않은 테스트용 소스입니다. 정식 main과 연결하지 마세요.

전체 파일을 내려받아 압축을 푼 뒤 기존 START_GAME.bat을 실행하고, 시작 위치에서 인간마을을 선택합니다.
게시판 오른쪽 아래 조온에게 접근한 뒤 F키로 대화합니다. 다음/F로 세 표정을 확인하고 Esc로 종료합니다.

운영 저장 키를 사용하지 않고 Firebase 설정 및 SDK/클라우드 UI 모듈을 HTML에서 로딩하지 않습니다.
기존 별도 테스트 키 gensokyo-rpg-school-test:permanent와 gensokyo-rpg-school-test:lastVisit을 유지합니다.
운영 기록을 자동 복사하거나 운영 클라우드에 업로드하지 않습니다.

main·Pages·Firebase 보안 규칙은 변경하지 않았습니다. 테스트 웹 배포는 별도 테스트 저장소 쓰기 권한이 없어 보류했습니다.

상세 동작과 검증 결과: npc/README.md 및 npc/verification/ 참조.
