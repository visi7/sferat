// apps/web/components/utils.ts
export function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime())/1000);
  const units: [number,string][] = [[31536000,'y'],[2592000,'mo'],[604800,'w'],[86400,'d'],[3600,'h'],[60,'m']];
  for (const [sec, label] of units) {
    const n = Math.floor(diff/sec);
    if (n >= 1) return `${n}${label} ago`;
  }
  return "just now";
}

export function expiresBadge(createdAt: string) {
  const exp = new Date(new Date(createdAt).getTime() + 7*24*3600*1000);
  const leftMs = exp.getTime() - Date.now();
  const d = Math.max(0, Math.floor(leftMs/86400000));
  const h = Math.max(0, Math.floor((leftMs%86400000)/3600000));
  return `${d}d ${h}h left`;
}
