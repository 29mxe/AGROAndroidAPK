AGROCONNECT v1.2 — СБОРКА APK ЧЕРЕЗ GITHUB

Проект подготовлен под standalone Android Release APK.
Мобильная часть находится в папке mobile/.

1. Создайте новый PRIVATE репозиторий GitHub.
2. Распакуйте ZIP и загрузите всё содержимое в корень репозитория.
3. Если скрытая папка .github не загрузилась, откройте Actions → New workflow → set up a workflow yourself и вставьте содержимое GITHUB_WORKFLOW_BUILD_APK.yml.
4. Actions → Build AgroConnect Android APK → Run workflow.
5. После зелёной сборки: Summary → Artifacts → AgroConnect-v1.2-APK.
6. В архиве артефакта будет AgroConnect-v1.2.apk.
7. Если Android не позволяет установить поверх старой версии из-за другой подписи, удалите старый AgroConnect и установите новый APK.

package id: com.vibecode.testapp
version: 1.2.0
versionCode: 3
backend: https://lilac-bottle.vibecode.run
сборка: Release / arm64-v8a / встроенный JS bundle
