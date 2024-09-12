# Features we would like to add

In order of priority

Functionality:

* Save output
* Add/Remove columns and rows entirely
* Moving entire columns
* Moving entire rows

Data:

* Filter columns
* Filter dates before/after/betweeen a given period.
* Sort by ascending/descending

# Feature list

These probably repeat some of the stuff above, but trying to brain dump at this stage.
I've tried to categorse according to [MoSCoW method](https://en.wikipedia.org/wiki/MoSCoW_method).
Happy for these to be moved about.

Must have

- Filter rows by value in single column
- Filter rows by pattern of single column
- Sort rows by value in single column (ascending / descending)
- Download current view of CSV as file
- Remove / hide column

Should have

- Reorder columns
- Remove / hide row
- Data type selection for columns (probably limit to: string = default, number, datetime)
- Filter rows by column numerical range (iff column contains numerical data)
- Filter rows by column date range (iff colummns)
- Add new column (e.g. for additional custom filtering, notes)

Could have

- Add new row
- Reorder rows /!\ WARNING possible thorny interaction with sort
- Sort rows by multiple columns
- Data type inference for columns, based on content of columns
- Save current CSV customisation so can be re-applied later. /!\ WARNING Very likely to be complet, given the wide possibility of changes. Maybe just sort / filter settings? /!\

Won't have

- Formula
- Full macro language