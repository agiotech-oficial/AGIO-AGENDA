#!/bin/bash
sed -i '/\.skiptranslate iframe, \.goog-te-banner-frame, #goog-gt-tt { display: none !important; }/d' app/globals.css
sed -i '/\.goog-te-spinner-pos { display: none !important; }/d' app/globals.css
sed -i '/body { top: 0 !important; }/d' app/globals.css
sed -i '/\/\* Google Translate Overrides \*\//,$d' app/globals.css

cat << 'CSSEOF' >> app/globals.css
/* Google Translate Overrides */
html {
  height: 100%;
}
body {
  top: 0 !important;
  position: static !important;
  margin-top: 0 !important;
}
iframe.goog-te-banner-frame,
.goog-te-balloon-frame,
#goog-gt-tt,
.goog-te-spinner-pos {
  display: none !important;
}
.goog-tooltip {
  display: none !important;
}
.goog-tooltip:hover {
  display: none !important;
}
.goog-text-highlight {
  background-color: transparent !important;
  border: none !important; 
  box-shadow: none !important;
}
font {
  background-color: transparent !important;
}
CSSEOF
