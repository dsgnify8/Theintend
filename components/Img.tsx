// Image, but cached to disk so it still shows with no signal.
//
// A drop-in for React Native's Image: it takes resizeMode and hands expo-image
// the contentFit it expects. Written this way so screens only change an import
// line, which is far safer across thirty files than rewriting every prop.
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';

type ResizeMode = 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';

const FIT: Record<ResizeMode, ExpoImageProps['contentFit']> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
  repeat: 'cover',
};

export type ImgProps = Omit<ExpoImageProps, 'contentFit'> & {
  resizeMode?: ResizeMode;
  contentFit?: ExpoImageProps['contentFit'];
};

export function Image({ resizeMode, contentFit, transition, ...rest }: ImgProps) {
  return (
    <ExpoImage
      {...rest}
      contentFit={contentFit ?? (resizeMode ? FIT[resizeMode] : 'cover')}
      // Memory and disk. Disk is the part that survives a restart with no signal.
      cachePolicy="memory-disk"
      // A short cross fade, so a cached image does not snap in.
      transition={transition ?? 160}
    />
  );
}

export default Image;
