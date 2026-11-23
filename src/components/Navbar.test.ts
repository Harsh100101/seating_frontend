import { describe, expect, it, vi } from 'vitest';
import { isPointerInsideDesktopNavigation } from './Navbar';

describe('authenticated header More-menu click boundary', () => {
  it('keeps pointerdown on the visible responsive menu inside the shared nav boundary', () => {
    const visibleMenuItem = {} as EventTarget;
    const contains = vi.fn((node: Node) => node === (visibleMenuItem as unknown as Node));
    const desktopNav = { contains };

    expect(isPointerInsideDesktopNavigation(desktopNav, visibleMenuItem)).toBe(true);
    expect(contains).toHaveBeenCalledWith(visibleMenuItem);
  });

  it('treats a pointerdown outside the desktop navigation as a click-away', () => {
    const outsideTarget = {} as EventTarget;
    const desktopNav = { contains: () => false };

    expect(isPointerInsideDesktopNavigation(desktopNav, outsideTarget)).toBe(false);
  });
});
