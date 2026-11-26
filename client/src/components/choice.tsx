import { Label, ListBox, Select } from "@heroui/react";

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Select
      variant="secondary"
      value={value}
      onChange={(key) => {
        const option = options.find(({ id }) => id === key);
        if (option) onChange(option.id);
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator className="size-4">
          <span aria-hidden="true">
            <span className="mx-auto block size-2 rotate-45 border-r-2 border-b-2 border-current" />
          </span>
        </Select.Indicator>
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map(({ id, label }) => (
            <ListBox.Item key={id} id={id} textValue={label}>
              {label}
              <ListBox.ItemIndicator className="[&:not([data-visible])]:invisible">
                <span className="h-2.5 w-1.5 rotate-45 border-r-2 border-b-2 border-current" />
              </ListBox.ItemIndicator>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
