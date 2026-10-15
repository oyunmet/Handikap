type RewardedSlot = {
  addService(service: unknown): RewardedSlot;
};

type RewardedEvent = {
  slot: RewardedSlot;
  makeRewardedVisible?: () => void;
  isEmpty?: boolean;
};

type GooglePubAds = {
  addEventListener(name: string, listener: (event: RewardedEvent) => void): void;
  removeEventListener?(name: string, listener: (event: RewardedEvent) => void): void;
};

type GooglePublisherTag = {
  apiReady?: boolean;
  cmd: Array<() => void>;
  enums: { OutOfPageFormat: { REWARDED: string } };
  defineOutOfPageSlot(path: string, format: string): RewardedSlot | null;
  pubads(): GooglePubAds;
  enableServices(): void;
  display(slot: RewardedSlot): void;
  destroySlots?(slots?: RewardedSlot[]): boolean;
};

declare global {
  interface Window {
    googletag?: GooglePublisherTag;
    __shafakGptReady?: Promise<GooglePublisherTag>;
    __shafakGptServicesEnabled?: boolean;
  }
}

export function getConfiguredRewardedAdUnit() {
  return import.meta.env.VITE_GAM_REWARDED_AD_UNIT_PATH?.trim() ?? "";
}

export async function requestGoogleRewardedAd(adUnitPath = getConfiguredRewardedAdUnit()): Promise<boolean> {
  if (!adUnitPath || typeof window === "undefined") return false;
  let tag: GooglePublisherTag;
  try {
    tag = await loadPublisherTag();
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    let slot: RewardedSlot | null = null;
    let granted = false;
    let settled = false;
    let timeoutId = 0;
    const pubads = tag.pubads();
    const finish = (rewardGranted: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      pubads.removeEventListener?.("rewardedSlotReady", onReady);
      pubads.removeEventListener?.("rewardedSlotGranted", onGranted);
      pubads.removeEventListener?.("rewardedSlotClosed", onClosed);
      pubads.removeEventListener?.("slotRenderEnded", onRenderEnded);
      if (slot) tag.destroySlots?.([slot]);
      resolve(rewardGranted);
    };
    const onReady = (event: RewardedEvent) => {
      if (event.slot === slot) event.makeRewardedVisible?.();
    };
    const onGranted = (event: RewardedEvent) => {
      if (event.slot === slot) granted = true;
    };
    const onClosed = (event: RewardedEvent) => {
      if (event.slot === slot) finish(granted);
    };
    const onRenderEnded = (event: RewardedEvent) => {
      if (event.slot === slot && event.isEmpty) finish(false);
    };

    tag.cmd.push(() => {
      try {
        slot = tag.defineOutOfPageSlot(adUnitPath, tag.enums.OutOfPageFormat.REWARDED);
        if (!slot) {
          finish(false);
          return;
        }
        slot.addService(pubads);
        pubads.addEventListener("rewardedSlotReady", onReady);
        pubads.addEventListener("rewardedSlotGranted", onGranted);
        pubads.addEventListener("rewardedSlotClosed", onClosed);
        pubads.addEventListener("slotRenderEnded", onRenderEnded);
        timeoutId = window.setTimeout(() => finish(false), 60_000);
        tag.display(slot);
      } catch {
        finish(false);
      }
    });
  });
}

function loadPublisherTag() {
  if (window.googletag?.apiReady) return Promise.resolve(window.googletag);
  if (window.__shafakGptReady) return window.__shafakGptReady;

  window.googletag ??= { cmd: [] } as unknown as GooglePublisherTag;
  window.__shafakGptReady = new Promise((resolve, reject) => {
    const selector = 'script[data-shafak-gpt="true"]';
    let script = document.querySelector<HTMLScriptElement>(selector);
    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.dataset.shafakGpt = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("error", () => reject(new Error("Google Publisher Tag failed to load.")), { once: true });
    script.addEventListener("load", () => {
      const tag = window.googletag;
      if (!tag) {
        reject(new Error("Google Publisher Tag did not initialize."));
        return;
      }
      tag.cmd.push(() => {
        if (!window.__shafakGptServicesEnabled) {
          tag.enableServices();
          window.__shafakGptServicesEnabled = true;
        }
        resolve(tag);
      });
    }, { once: true });
  });
  return window.__shafakGptReady;
}
