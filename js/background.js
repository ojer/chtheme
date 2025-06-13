const KEY_PREFIX = "182931340";
const storageKey = (str) => `${KEY_PREFIX}_active_dark_${str}`;

const canvas = document.createElement("canvas");
canvas.setAttribute("width", "32");
canvas.setAttribute("height", "32");
const ctx = canvas.getContext("2d");

const debugEnable = 1;
const debug = (...par) => {
  if (debugEnable) {
    console.debug(...par);
  }
};

const getCurrentThemeInfo = async () => {
  const themeInfo = await browser.theme.getCurrent();
  debug("theme-color:", themeInfo);
  if (themeInfo.colors) {
    debug(JSON.stringify(themeInfo.colors));
    return {
      ...themeInfo.colors,
    };
  } else {
    return {};
  }
};

const colorView = (colors) => {
  const mainDiv = document.createElement("div");
  let frame = "#fff";
  const colorGroup = Object.keys(colors).reduce((acc, cur) => {
    const groupName = cur.substring(0, 1);
    const group = acc[groupName] ?? [];
    return {
      ...acc,
      [groupName]: [...group, [cur, colors[cur] ?? ""]],
    };
  }, {});

  Object.keys(colorGroup).forEach((name) => {
    const parent = document.createElement("div");
    parent.setAttribute("style", "display: flex; flex-wrap: wrap;");
    const colors = colorGroup[name];
    colors.forEach(([key, color]) => {
      if (key === "frame") {
        frame = color ?? "#fff";
      }
      const div = document.createElement("div");
      div.setAttribute(
        "style",
        `height: 88px;
         flex: 0 0 64px;
         display: flex;
  			 align-items: end;
         margin: 15px;
         border: solid 1px #fff;
         background: ${color}`,
      );

      const div2 = document.createElement("div");
      div2.setAttribute(
        "style",
        `height: 24px; 
         word-wrap: break-word;
         background: #fff;
         color: #000;
         width: 100%;
  			 text-align: center;
         `,
      );

      div2.innerText = key;
      div.appendChild(div2);
      parent.appendChild(div);
    });
    mainDiv.appendChild(parent);
  });
  mainDiv.setAttribute("style", `background: ${frame}`);
  document.body.innerHTML = "";
  document.body.appendChild(mainDiv);
};

const genIcon = (counterclockwise) => {
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

  return ctx.getImageData(0, 0, 32, 32);
};

const setAction = async (enable) => {
  const themeColors = await getCurrentThemeInfo();
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
    imageData: genIcon(enable),
  });
};

const main = async () => {
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
