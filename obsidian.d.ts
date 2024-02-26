import { Menu } from "obsidian";

declare module "obsidian" {
    interface MenuItem {
        setSubmenu: () => void;
        submenu: Menu;
    }
}
