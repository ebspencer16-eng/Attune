import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          //
          // In a try, because this is an onPress and an onPress does not await
          // what it calls: a browser that refuses the URL rejects a promise
          // with nowhere to go, which surfaces as an "Uncaught (in promise)"
          // banner in development and as a tap that did nothing in a build.
          try {
            await openBrowserAsync(href, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
          } catch (e) {
            console.warn('[ExternalLink] would not open', href, e);
          }
        }
      }}
    />
  );
}
