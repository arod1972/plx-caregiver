import { requireNativeModule } from "expo";

type Native = {
  recognize(uri: string): Promise<string>;
};

const native = requireNativeModule<Native>("LabelOcr");

export function recognize(uri: string) {
  return native.recognize(uri);
}
