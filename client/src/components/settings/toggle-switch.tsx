import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface ToggleSwitchProps {
  label?: string;
  description?: string;
  initialState?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export function ToggleSwitch({
  label,
  description,
  initialState = false,
  disabled = false,
  onChange
}: ToggleSwitchProps) {
  const [checked, setChecked] = useState(initialState);

  const handleCheckedChange = (value: boolean) => {
    setChecked(value);
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        {label && <div className="text-sm font-medium">{label}</div>}
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}