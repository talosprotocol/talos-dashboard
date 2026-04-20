import { Skeleton } from "@/components/ui/Skeleton";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function AuditTableSkeleton() {
  return (
    <div className="space-y-4">
      <GlassPanel className="overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-4"><Skeleton className="h-4 w-4" /></th>
                <th className="px-4 py-4"><Skeleton className="h-4 w-24" /></th>
                <th className="px-4 py-4"><Skeleton className="h-4 w-32" /></th>
                <th className="px-4 py-4"><Skeleton className="h-4 w-20" /></th>
                <th className="px-4 py-4"><Skeleton className="h-4 w-40" /></th>
                <th className="px-4 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
