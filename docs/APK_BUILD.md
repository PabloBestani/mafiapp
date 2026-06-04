# Build APK Android

La ruta simple para probar en un celular Android no usa EAS ni servicios externos.

## Requisitos locales

- Node/npm con dependencias instaladas.
- JDK compatible con React Native/Gradle.
- Android SDK instalado y visible para Gradle.

## APK de prueba

```powershell
npm install
npm run apk:local
```

`apk:local` genera un build release local standalone, firmado con la debug keystore que crea Expo prebuild. Es suficiente para instalar manualmente en un teléfono y probar la V1 sin Metro ni EAS.

Expo crea la carpeta `android/` con prebuild local y Gradle produce:

```txt
android/app/build/outputs/apk/release/app-release.apk
```

Para dejarlo listo en el Desktop:

```powershell
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination "$env:USERPROFILE/Desktop/MafiApp-v0.1.0.apk" -Force
```

## Build debug

```powershell
npm run apk:debug
```

El build debug queda disponible para desarrollo. Para pasar un archivo al celular y probar sin Metro, usar `apk:local`.

## Release firmado para distribución

El release local actual está firmado con debug keystore. Antes de distribuirlo fuera de pruebas internas hay que configurar una keystore propia. Para publicar en Play Store conviene generar un AAB firmado, pero eso queda fuera de la V1 offline local.

## Notas

- `android/` está ignorado por Git porque es salida generada por Expo prebuild.
- Si Gradle falla por SDK/JDK, instalar Android Studio o configurar `ANDROID_HOME`/`ANDROID_SDK_ROOT` suele resolverlo.
