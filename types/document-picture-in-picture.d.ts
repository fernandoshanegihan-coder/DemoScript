type PictureInPictureOptions = {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
};

type DocumentPictureInPicture = {
  requestWindow: (options?: PictureInPictureOptions) => Promise<Window>;
  readonly window: Window | null;
};

interface WindowWithPictureInPicture extends Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
