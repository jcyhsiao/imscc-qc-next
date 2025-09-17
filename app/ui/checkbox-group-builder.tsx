import { CheckboxGroup, Checkbox } from "@adobe/react-spectrum";
import { capitalize } from "@/app/ui/helpers";

type Props = {
  label: string;
  name: string;
  values: string[];
  valuesCounts?: { [key: string]: number };
  valuesLabelsOverrides?: { [key: string]: string };
  selectedValues: string[];
  onChange: (newSelectedValues: string[]) => void;
};

export default function CheckboxGroupBuilder({
  label,
  name,
  values,
  valuesCounts,
  valuesLabelsOverrides,
  selectedValues,
  onChange: setSelectedValues,
}: Props) {
  return (
    <CheckboxGroup
      label={label}
      name={name}
      value={selectedValues}
      onChange={setSelectedValues}
    >
      {Array.from(values).map((option) => {
        const valueCount =
          valuesCounts && valuesCounts[option] !== undefined
            ? valuesCounts[option]
            : 0;
        const optionLabel =
          valuesLabelsOverrides && valuesLabelsOverrides[option] !== undefined
            ? valuesLabelsOverrides[option]
            : option;
        return (
          <Checkbox key={option} value={option}>
            {capitalize(optionLabel)} ({valueCount})
          </Checkbox>
        );
      })}
    </CheckboxGroup>
  );
}
