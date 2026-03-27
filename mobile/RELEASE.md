# Mobile release notes

This project uses EAS/Expo or a bare React Native workflow. Use these steps to create production builds.

1. Prepare `eas.json` and `app.json` values for production.
2. Create `production` build profile in `eas.json` (already present? check file).
3. Ensure you have the Android keystore and Apple signing credentials.

EAS build example:

```bash
cd mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

You will need to provide secrets to GitHub Actions or to EAS: `EAS_TOKEN`, `GOOGLE_SERVICE_ACCOUNT`, `ANDROID_KEYSTORE_BASE64`, `APPLE_CERT_BASE64`.
