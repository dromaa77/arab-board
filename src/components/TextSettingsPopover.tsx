import { useTextSettings, fontOptions, FontFamily } from '@/hooks/useTextSettings';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Minus, Plus } from 'lucide-react';

export default function TextSettingsPopover() {
  const { settings, setFontSize, toggleBold, setFontFamily, getTextStyle } = useTextSettings();

  const sizeLabels = ['XS', 'S', 'M', 'L', 'XL'];
  const sizeValues = [0.85, 0.925, 1, 1.1, 1.2];
  
  const currentSizeIndex = sizeValues.findIndex(v => Math.abs(v - settings.fontSize) < 0.01);
  const displaySizeLabel = currentSizeIndex >= 0 ? sizeLabels[currentSizeIndex] : 'M';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Type className="h-4 w-4" />
          <span className="sr-only">Text settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Text Settings</h4>
          
          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-sm">Font</Label>
            <Select 
              value={settings.fontFamily} 
              onValueChange={(value: FontFamily) => setFontFamily(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value === 'system' ? 'inherit' : font.label }}>
                      {font.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Size</Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{displaySizeLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <Slider
                value={[settings.fontSize]}
                min={0.85}
                max={1.2}
                step={0.075}
                onValueChange={([value]) => setFontSize(value)}
                className="flex-1"
              />
              <Plus className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          
          {/* Bold Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="bold-toggle" className="text-sm">Bold Text</Label>
            <Switch
              id="bold-toggle"
              checked={settings.isBold}
              onCheckedChange={toggleBold}
            />
          </div>
          
          {/* Preview */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <p 
              className="text-muted-foreground leading-relaxed"
              style={getTextStyle()}
            >
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
