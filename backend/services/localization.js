class EthiopianLanguageService {
  translate(text) {
    return text;
  }
}

class LocalizationService {
  constructor() {}
  t(key) {
    return key;
  }
}

module.exports = {
  EthiopianLanguageService,
  LocalizationService
};
