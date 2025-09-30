# Developer Guide for Building Additional Utilities

This guide documents best practices and lessons learned from building the network latency calculator. Follow these guidelines when adding new utilities to ensure smooth development and deployment.

## Table of Contents
1. [Responsive Design from Day One](#responsive-design-from-day-one)
2. [Iframe Embedding Considerations](#iframe-embedding-considerations)
3. [Layout and Spacing](#layout-and-spacing)
4. [State Management and Performance](#state-management-and-performance)
5. [Testing Checklist](#testing-checklist)

---

## Responsive Design from Day One

### Always Use Tailwind Responsive Classes

Don't build for desktop first and retrofit mobile later. Use responsive classes from the start:

```jsx
// ❌ BAD - Desktop only
<div className="p-6 text-base">
  <h1 className="text-2xl">Title</h1>
</div>

// ✅ GOOD - Mobile first, responsive
<div className="p-3 sm:p-4 md:p-6 text-xs sm:text-sm md:text-base">
  <h1 className="text-lg sm:text-xl md:text-2xl">Title</h1>
</div>
```

### Key Responsive Patterns

**Spacing (padding/margin/gap):**
```jsx
className="p-2 sm:p-3 md:p-4"           // Padding
className="mt-3 sm:mt-4 md:mt-6"        // Margin
className="gap-2 sm:gap-3 md:gap-4"     // Gap
className="space-y-3 sm:space-y-4 md:space-y-6" // Vertical spacing
```

**Typography:**
```jsx
className="text-xs sm:text-sm md:text-base"     // Body text
className="text-sm sm:text-base md:text-lg"     // Larger text
className="text-[10px] sm:text-xs"              // Very small text
```

**Component Sizing:**
```jsx
className="h-8 sm:h-9 md:h-10"          // Input/button heights
className="w-16 sm:w-20 md:w-24"        // Width
className="min-w-[500px]"               // Minimum width for tables
```

**Grid Layouts:**
```jsx
// Stack on mobile, 2 cols on tablet, 4 cols on desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"

// Always 2 cols on mobile, 4 on larger screens
className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
```

**Flexbox:**
```jsx
// Stack vertically on mobile, horizontal on tablet+
className="flex flex-col sm:flex-row gap-2 sm:gap-3"
```

### Test on Multiple Viewports

- **Mobile**: 320px - 480px (iPhone SE, small phones)
- **Tablet**: 481px - 768px (iPad, tablets)
- **Desktop**: 769px+ (laptops, desktops)

Use browser DevTools responsive mode to test at:
- 320px (very narrow)
- 375px (iPhone standard)
- 768px (tablet)
- 1024px (desktop)

---

## Iframe Embedding Considerations

### 1. Minimize Dead Space

When building utilities that will be embedded in iframes, avoid excessive padding and margins:

```jsx
// ❌ BAD - Creates huge dead space in iframe
<div className="min-h-screen p-8 pb-20 sm:p-20 mt-16">
  <Component />
</div>

// ✅ GOOD - Compact for iframe embedding
<div className="p-4 sm:p-6 md:p-8">
  <Component />
</div>
```

**Key principles:**
- Don't use `min-h-screen` - let content determine height
- Keep top/bottom padding minimal (p-4 to p-8)
- Avoid large top margins (no mt-16)
- Remove bottom padding that creates gaps (no pb-20)

### 2. Implement Dynamic Height Resizing

Always include postMessage height communication for iframe embedding. This is already implemented in `src/pages/index.js`:

```jsx
useEffect(() => {
  let lastHeight = 0;
  let resizeTimeout = null;

  function sendHeight() {
    const height = document.documentElement.scrollHeight;

    // Only send if height changed (prevents loops)
    if (height === lastHeight) return;
    lastHeight = height;

    // Send to parent if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'resize',
        height: height
      }, '*');
    }
  }

  // Debounce rapid changes
  function debouncedSendHeight() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(sendHeight, 100);
  }

  sendHeight(); // Initial
  window.addEventListener('resize', debouncedSendHeight);

  const observer = new MutationObserver(debouncedSendHeight);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  const interval = setInterval(sendHeight, 500); // Fallback

  return () => {
    window.removeEventListener('resize', debouncedSendHeight);
    observer.disconnect();
    clearInterval(interval);
    if (resizeTimeout) clearTimeout(resizeTimeout);
  };
}, []);
```

**Critical elements:**
- Track `lastHeight` to prevent infinite loops
- Debounce rapid changes (100ms)
- Use MutationObserver for DOM changes
- Include periodic fallback check (500ms)
- Clean up properly on unmount

### 3. Design for Narrow Widths

Assume your utility will be embedded in narrow WordPress sidebars or columns:

```jsx
// ✅ Use max-width and full width
<div className="w-full max-w-4xl">

// ✅ Make tables horizontally scrollable
<div className="overflow-x-auto -mx-3 sm:mx-0">
  <table className="min-w-[500px]">

// ✅ Stack navigation on mobile
<div className="flex flex-col sm:flex-row">
```

---

## Layout and Spacing

### Component Structure

Use consistent spacing hierarchy:

```jsx
<Card className="w-full">
  {/* Headers: p-3 sm:p-4 md:p-6 */}
  <CardHeader className="p-3 sm:p-4 md:p-6">
    <CardTitle className="text-base sm:text-lg md:text-xl">Title</CardTitle>
    <CardDescription className="text-xs sm:text-sm">Description</CardDescription>
  </CardHeader>

  {/* Content: same padding as header */}
  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
    {/* Form fields */}
    <div className="space-y-1.5 sm:space-y-2">
      <Label className="text-xs sm:text-sm">Label</Label>
      <Input className="text-xs sm:text-sm h-8 sm:h-9 md:h-10" />
    </div>
  </CardContent>
</Card>
```

### Spacing Scale Reference

Use these standard spacing values:

| Size | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| XS   | `p-2`  | `sm:p-2.5` | `md:p-3` |
| SM   | `p-3`  | `sm:p-4`   | `md:p-6` |
| MD   | `p-4`  | `sm:p-6`   | `md:p-8` |

### Text Size Scale

| Use Case | Classes |
|----------|---------|
| Very small | `text-[10px] sm:text-xs` |
| Small text | `text-xs sm:text-sm` |
| Body text | `text-xs sm:text-sm md:text-base` |
| Headings | `text-sm sm:text-base md:text-lg` |
| Large headings | `text-base sm:text-lg md:text-xl` |
| Results/metrics | `text-lg sm:text-xl md:text-2xl` |

---

## State Management and Performance

### Debounce Expensive Operations

When operations trigger on user input or frequent events:

```jsx
const [searchTerm, setSearchTerm] = useState('');
const [debouncedTerm, setDebouncedTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedTerm(searchTerm);
  }, 300);

  return () => clearTimeout(timer);
}, [searchTerm]);

// Use debouncedTerm for API calls
useEffect(() => {
  if (debouncedTerm) {
    fetchResults(debouncedTerm);
  }
}, [debouncedTerm]);
```

### Prevent Unnecessary Re-renders

```jsx
// ✅ Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// ✅ Memoize callbacks passed to child components
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### Dynamic Imports for Heavy Components

```jsx
// ✅ Dynamically import map components (SSR issues with Leaflet)
const MapView = dynamic(() => import("./map-view"), { ssr: false });
```

---

## Testing Checklist

### Before Committing

- [ ] Test on mobile (320px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1024px+ width)
- [ ] Test in iframe (embedded view)
- [ ] All text is readable at smallest size
- [ ] No horizontal scrolling on mobile (except intentional tables)
- [ ] Buttons and inputs are easily tappable (min 32px touch target)
- [ ] Forms work well on mobile keyboards
- [ ] Tab navigation makes sense
- [ ] Loading states are handled
- [ ] Error states are clear and helpful

### Browser Testing

Test in at least:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on Mac)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Accessibility

- [ ] All interactive elements have proper labels
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works
- [ ] Screen reader friendly (semantic HTML)
- [ ] Focus indicators are visible

---

## Common Pitfalls to Avoid

### 1. Fixed Widths on Mobile
```jsx
// ❌ BAD
<div className="w-[600px]">

// ✅ GOOD
<div className="w-full max-w-[600px]">
```

### 2. Non-Responsive Tables
```jsx
// ❌ BAD - Will overflow on mobile
<table className="w-full">

// ✅ GOOD - Scrollable on mobile
<div className="overflow-x-auto">
  <table className="min-w-[500px]">
```

### 3. Too Small Touch Targets
```jsx
// ❌ BAD - Hard to tap on mobile
<button className="h-6 w-6">

// ✅ GOOD - Comfortable tap target
<button className="h-10 w-10 sm:h-8 sm:w-8">
```

### 4. Forgetting to Test Tab Switches
When building tabbed interfaces, ensure:
- Height updates properly when switching tabs
- Content doesn't overflow
- Tab navigation is clear on mobile
- Active tab is visually distinct

### 5. Not Testing with Real Content
Always test with:
- Long addresses/city names
- Large numbers
- Error messages
- Empty states
- Loading states

---

## Performance Optimization

### Images and Assets
```jsx
// Use Next.js Image for optimization (when not using static export)
import Image from 'next/image';

// For static export, ensure images are optimized beforehand
```

### Code Splitting
```jsx
// Split large utilities into separate route pages
// pages/latency-calculator.js
// pages/bandwidth-calculator.js
// etc.
```

### Lazy Loading
```jsx
// Lazy load components that aren't immediately visible
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false
});
```

---

## Git Commit Best Practices

### Commit Message Format

```
Brief description (imperative mood, 50 chars max)

Detailed explanation:
- What changed and why
- Any breaking changes
- Related issues

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### When to Commit

- After completing a feature
- After fixing a bug
- After improving responsiveness
- After significant refactoring
- Before starting major new work

**Don't commit:**
- Broken code
- Console.log statements for debugging
- Commented-out code
- Large commented sections

---

## Deployment Checklist

Before deploying to production:

- [ ] All console errors resolved
- [ ] No console.log statements (except intentional logging)
- [ ] Environment variables configured
- [ ] Build succeeds (`npm run build`)
- [ ] Static export works (`next build` with output: 'export')
- [ ] Test deployed version in iframe on WordPress
- [ ] Verify iframe resizing works
- [ ] Check all three breakpoints (mobile, tablet, desktop)
- [ ] Verify external links open in new tabs
- [ ] Test all calculators/utilities
- [ ] Performance is acceptable (Lighthouse score)

---

## Quick Reference Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Export static site
npm run build  # (with output: 'export' in next.config.mjs)

# Test production build locally
npx serve out

# Commit changes
git add .
git commit -m "Your message"
git push origin main

# Check for issues
npm run lint  # (if configured)
```

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Responsive Design Patterns](https://web.dev/patterns/layout/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Summary

**The Golden Rules:**

1. 🎯 **Mobile First**: Start with mobile, enhance for larger screens
2. 📦 **Compact Layout**: Minimize dead space for iframe embedding
3. 📱 **Test Early**: Check mobile/tablet/desktop from day one
4. 🔄 **Dynamic Heights**: Always implement iframe height messaging
5. ⚡ **Performance**: Debounce, memoize, lazy load
6. ♿ **Accessible**: Semantic HTML, proper labels, keyboard nav
7. 🧪 **Test Thoroughly**: Real devices, real content, edge cases

Follow these guidelines and you'll avoid the issues we encountered while building the network latency calculator. Happy coding! 🚀
