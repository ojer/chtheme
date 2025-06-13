const KEY_PREFIX = "182931340";
const storageKey = (str) => `${KEY_PREFIX}_active_dark_${str}`;
const iconImageData = { light: {}, dark: {} };

const debugEnable = 1;
const debug = (...par) => {
  if (debugEnable) {
    console.debug(...par);
  }
};

const setAction = async (enable) => {
  const bronColor = "#fff";
  const backColor = "#000";
  browser.browserAction.setBadgeText({
    text: enable ? "夜" : "昼",
  });
  browser.browserAction.setBadgeTextColor({
    color: enable ? bronColor : backColor,
  });
  browser.browserAction.setBadgeBackgroundColor({
    color: enable ? backColor : bronColor,
  });

  browser.browserAction.setIcon({
    imageData: iconImageData[enable ? "dark" : "light"],
  });
};

const genIcon = (counterclockwise) => {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("width", "32");
  canvas.setAttribute("height", "32");
  const ctx = canvas.getContext("2d");
  const x = 16;
  const y = 16;
  const radius = 14.5;
  ctx.reset();
  {
    ctx.beginPath();
    const startAngle = 0;
    const endAngle = Math.PI + Math.PI;
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }

  {
    ctx.beginPath();
    const startAngle = Math.PI + Math.PI / 2;
    const endAngle = Math.PI - Math.PI / 2;
    ctx.arc(x, y, radius, startAngle, endAngle, !counterclockwise);
    ctx.fillStyle = "#000";
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, 32, 32);
  canvas.remove();
  return imageData;
};

const main = async () => {
  iconImageData.light = genIcon(false);
  iconImageData.dark = genIcon(true);

  const handleClicked = async (activeInfo) => {
    debug(activeInfo);
    const { active, url } = activeInfo;
    if (active && url) {
      await setColorScheme(url, true);
    }
  };
  if (!browser.browserAction.onClicked.hasListener(handleClicked)) {
    browser.browserAction.onClicked.addListener(handleClicked);
  }

  const handleUpdated = async (tableId, changeInfo, tab) => {
    await setColorScheme(changeInfo.url);
  };

  if (!browser.tabs.onUpdated.hasListener(handleUpdated)) {
    browser.tabs.onUpdated.addListener(handleUpdated);
  }

  const handleActivated = (activeInfo) => {
    const { tabId } = activeInfo;
    browser.tabs.get(tabId).then((tab) => {
      setColorScheme(tab.url);
    });
  };

  if (!browser.tabs.onActivated.hasListener(handleActivated)) {
    browser.tabs.onActivated.addListener(handleActivated);
  }
};

const setColorScheme = async (url, reverse = false) => {
  if (!url) {
    return;
  }
  let host = "";
  if (URL.canParse(url)) {
    host = new URL(url).host;
  }
  if (!host) {
    host = "chrome://firefox";
  }
  const id = storageKey(btoa(host));
  const vals = await browser.storage.local
    .get(id)
    .then((res) => Object.values(res));
  let activeDark = vals.at(0);

  const currentColor = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  if (activeDark === undefined) {
    activeDark = currentColor;
  }

  if (reverse) {
    await browser.storage.local.set({ [id]: Boolean(reverse ^ activeDark) });
    activeDark = Boolean(reverse ^ activeDark);
  }
  debug("set-color, auto:", !reverse, host, currentColor, "->", activeDark);
  // light, dark, system browser
  browser.browserSettings.overrideContentColorScheme
    .set({
      value: activeDark ? "dark" : "light",
    })
    .then(() => {
      setAction(activeDark);
    });
};
main();
