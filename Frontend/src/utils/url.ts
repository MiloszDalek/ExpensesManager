type PageName =
  | "Home"
  | "Groups"
  | "GroupDetail"
  | "NewGroup"
  | "Settings"
  | "Dashboard"
  | "Profile";


const PAGE_PATHS: Record<PageName, string> = {
  Home: "/",
  Groups: "/groups",
  GroupDetail: "/groups/detail",
  NewGroup: "/groups/new",
  Settings: "/settings",
  Dashboard: "/dashboard",
  Profile: "/profile",
};


export function createPageUrl(page: PageName, params?: Record<string, string | number>): string {
  let path = PAGE_PATHS[page];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, String(value));
    }
  }
  return path;
}
