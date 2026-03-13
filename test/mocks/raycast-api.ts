export const Clipboard = {
  async copy(_content: string | number | { file?: string }) {
    return;
  },
};

export const Toast = {
  Style: {
    Animated: "Animated",
    Failure: "Failure",
  },
};

export async function showToast() {
  return {
    title: "",
    message: "",
    style: Toast.Style.Animated,
    hide: () => undefined,
  };
}

export async function showHUD(_message: string) {
  return;
}

export const environment = {
  assetsPath: "",
};
