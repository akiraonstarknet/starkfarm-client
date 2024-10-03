import React, { memo, useEffect, useRef } from 'react';

function TradingViewWidget({ tokenName }: { tokenName: string }) {
  const container = useRef<HTMLDivElement>(null);

  console.log(tokenName, 'hh');

  useEffect(() => {
    const script = document.createElement('script');

    if (tokenName) {
      script.src =
        'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      script.type = 'text/javascript';
      script.async = true;

      if (tokenName === 'ETH') {
        script.innerHTML = `
          {
            "symbols": [
              [
                "COINBASE:ETHUSD|1M"
              ]
            ],
            "chartOnly": false,
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "dark",
            "autosize": true,
            "showVolume": false,
            "showMA": false,
            "hideDateRanges": false,
            "hideMarketStatus": false,
            "hideSymbolLogo": false,
            "scalePosition": "right",
            "scaleMode": "Normal",
            "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
            "fontSize": "10",
            "noTimeScale": false,
            "valuesTracking": "1",
            "changeMode": "price-and-percent",
            "chartType": "area",
            "maLineColor": "#2962FF",
            "backgroundColor": "rgba(26, 26, 39, 1)",
            "maLineWidth": 1,
            "maLength": 9,
            "headerFontSize": "medium",
            "lineWidth": 2,
            "lineType": 0,
            "lineColor": "rgba(132, 132, 194, 1)",
            "dateRanges": [
              "1d|1",
              "1m|30",
              "3m|60",
              "12m|1D",
              "60m|1W",
              "all|1M"
            ]
          }`;
      }

      if (tokenName === 'STRK') {
        script.innerHTML = `
          {
            "symbols": [
              [
                "BITFINEX:STRKUSD|1M"
              ]
            ],
            "chartOnly": false,
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "dark",
            "autosize": true,
            "showVolume": false,
            "showMA": false,
            "hideDateRanges": false,
            "hideMarketStatus": false,
            "hideSymbolLogo": false,
            "scalePosition": "right",
            "scaleMode": "Normal",
            "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
            "fontSize": "10",
            "noTimeScale": false,
            "valuesTracking": "1",
            "changeMode": "price-and-percent",
            "chartType": "area",
            "maLineColor": "#2962FF",
            "backgroundColor": "rgba(26, 26, 39, 1)",
            "maLineWidth": 1,
            "maLength": 9,
            "headerFontSize": "medium",
            "lineWidth": 2,
            "lineType": 0,
            "lineColor": "rgba(132, 132, 194, 1)",
            "dateRanges": [
              "1d|1",
              "1m|30",
              "3m|60",
              "12m|1D",
              "60m|1W",
              "all|1M"
            ]
          }`;
      }

      if (tokenName === 'USDC') {
        script.innerHTML = `
          {
            "symbols": [
              [
                "BITSTAMP:USDCUSD|1M"
              ]
            ],
            "chartOnly": false,
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "dark",
            "autosize": true,
            "showVolume": false,
            "showMA": false,
            "hideDateRanges": false,
            "hideMarketStatus": false,
            "hideSymbolLogo": false,
            "scalePosition": "right",
            "scaleMode": "Normal",
            "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
            "fontSize": "10",
            "noTimeScale": false,
            "valuesTracking": "1",
            "changeMode": "price-and-percent",
            "chartType": "area",
            "maLineColor": "#2962FF",
            "backgroundColor": "rgba(26, 26, 39, 1)",
            "maLineWidth": 1,
            "maLength": 9,
            "headerFontSize": "medium",
            "lineWidth": 2,
            "lineType": 0,
            "lineColor": "rgba(132, 132, 194, 1)",
            "dateRanges": [
              "1d|1",
              "1m|30",
              "3m|60",
              "12m|1D",
              "60m|1W",
              "all|1M"
            ]
          }`;
      }

      container?.current?.appendChild(script);
    }

    return () => {
      container?.current?.removeChild(script);
    };
  }, [tokenName]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TradingViewWidget);
