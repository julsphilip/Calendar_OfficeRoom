## Packages
date-fns | Essential for manipulating and formatting appointment dates/times

## Notes
- The API expects `startTime` and `endTime` as ISO date strings/objects. The frontend form will collect a single Date and separate Time strings (e.g., "09:00"), combining them before submission.
- The Staff Dashboard utilizes a CSS Grid-based timeline view for visualizing room occupancy across the 5:00 AM - 8:00 PM operating hours.
