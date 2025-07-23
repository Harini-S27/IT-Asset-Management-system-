import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const blockWebsiteSchema = z.object({
  targetDomain: z.string()
    .min(3, "Domain must be at least 3 characters")
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 
          "Please enter a valid domain name"),
  blockType: z.enum(["domain", "url", "ip"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

interface BlockWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: number;
  networkDeviceId?: number;
  deviceName?: string;
  deviceIp?: string;
}

const BlockWebsiteDialog = ({ 
  open, 
  onOpenChange, 
  deviceId, 
  networkDeviceId, 
  deviceName, 
  deviceIp 
}: BlockWebsiteDialogProps) => {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(blockWebsiteSchema),
    defaultValues: {
      targetDomain: "",
      blockType: "domain" as const,
      reason: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/website-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          deviceId,
          networkDeviceId,
          createdBy: "admin",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create website block");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Website block created",
        description: "The website blocking request has been submitted to the firewall.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/website-blocks'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create website block: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutate(data);
  };

  const handleDomainChange = (value: string) => {
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipRegex.test(value)) {
      form.setValue("blockType", "ip");
    } else if (value.includes("/") || value.includes("?")) {
      form.setValue("blockType", "url");
    } else {
      form.setValue("blockType", "domain");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Block Website</DialogTitle>
          <DialogDescription>
            Block access to a website or domain for {deviceName || "this device"} 
            {deviceIp && ` (${deviceIp})`}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website/Domain to Block</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., facebook.com, youtube.com, 192.168.1.1"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleDomainChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blockType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Block Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select block type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="domain">Domain (blocks all subdomains)</SelectItem>
                      <SelectItem value="url">Specific URL</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Blocking</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Productivity policy violation, Security risk, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Network-level blocking
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    This will create a firewall rule to block access from this device. 
                    Changes may take a few moments to take effect.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating Block..." : "Block Website"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BlockWebsiteDialog;