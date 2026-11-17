// Minimal ambient typings for the subset of crypto-js used by the encryption service and its tests.
declare module 'crypto-js' {
  interface Encoder {
    readonly __encoder?: never;
  }
  interface CipherParams {
    toString(encoder?: Encoder): string;
  }
  const CryptoJS: {
    AES: {
      encrypt(message: string, passphrase: string): CipherParams;
      decrypt(ciphertext: string, passphrase: string): CipherParams;
    };
    enc: {
      Utf8: Encoder;
    };
  };
  export default CryptoJS;
}
