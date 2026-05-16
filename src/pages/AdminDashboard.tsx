import { useState, useEffect, useMemo } from "react";
import { useCourses } from "@/hooks/useCourses";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { CourseDetailModal } from "@/components/courses/CourseDetailModal";
import { InstructorDetailModal } from "@/components/instructors/InstructorDetailModal";
import { TablePagination } from '@/components/ui/TablePagination'
import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import type { VStudentCourseCatalog } from "@/types/database";

const CURRENT_YEAR = 2025;

type SearchType = "code" | "title" | "teacher" | "area";

interface SearchChip {
  type: SearchType;
  value: string;
}

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  code: "Code",
  title: "Title",
  teacher: "Teacher",
  area: "Area",
};

const SEARCH_TYPE_COLORS: Record<SearchType, string> = {
  code: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  title: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  teacher:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  area: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const TOPIC_COLORS: Record<string, string> = {
  "Chinese Philosophy":
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Western Philosophy":
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Logic:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Ethics: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Core: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Elective: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

function getTopicColor(topic: string): string {
  return (
    TOPIC_COLORS[topic] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
}

function formatEnrollment(enrolled: number, min: number, max: number): string {
  if (min !== max) {
    return `${enrolled} / ${min}-${max}`;
  }
  return `${enrolled} / ${max}`;
}

type SearchMode = "single" | "range";

export function AdminDashboard() {
  const [searchMode, setSearchMode] = useState<SearchMode>("single");
  const [selectedYear, setSelectedYear] = useState<number | null>(CURRENT_YEAR);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);

  const [searchChips, setSearchChips] = useState<SearchChip[]>([]);
  const [searchType, setSearchType] = useState<SearchType>("title");
  const [searchInput, setSearchInput] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState<VStudentCourseCatalog | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(
    null,
  );
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);

  // Data fetching - call hooks early
  const { courses, loading, error, availableYears, availableTerms } = useCourses(
    searchMode === "single"
      ? { year: selectedYear ?? undefined, term: selectedTerm ?? undefined }
      : {},
  );

  // Sorting state
  const [sortColumn, setSortColumn] = useState<"code" | "title" | "credits" | "lecturer" | "enrollment" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Enrollment display mode
  const [enrollmentDisplayMode, setEnrollmentDisplayMode] = useState<"numbers" | "percentage">("numbers");

  const autocompleteSuggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const query = searchInput.toLowerCase();
    const suggestions = new Set<string>();

    courses.forEach((course) => {
      switch (searchType) {
        case "code":
          const codeToSearch = course.class_code || course.course_code;
          if (codeToSearch?.toLowerCase().includes(query)) {
            suggestions.add(codeToSearch);
          }
          break;
        case "title":
          if (course.title?.toLowerCase().includes(query)) {
            suggestions.add(course.title);
          }
          break;
        case "teacher":
          if (course.lecturer_name?.toLowerCase().includes(query)) {
            suggestions.add(course.lecturer_name);
          }
          break;
        case "area":
          course.sub_topics?.forEach((topic) => {
            if (topic.toLowerCase().includes(query)) {
              suggestions.add(topic);
            }
          });
          break;
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }, [courses, searchInput, searchType]);

  const addChip = (value: string) => {
    if (!value.trim()) return;
    const exists = searchChips.some(
      (c) =>
        c.type === searchType && c.value.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) {
      setSearchChips([
        ...searchChips,
        { type: searchType, value: value.trim() },
      ]);
    }
    setSearchInput("");
    setAutocompleteOpen(false);
  };

  const removeChip = (index: number) => {
    setSearchChips(searchChips.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (
      searchMode === "single" &&
      availableTerms.length > 0 &&
      selectedTerm === null
    ) {
      const latestTerm = Math.max(...availableTerms);
      setSelectedTerm(latestTerm);
    }
  }, [availableTerms, selectedTerm, searchMode]);

  useEffect(() => {
    if (searchMode === "range" && availableYears.length > 0) {
      if (yearFrom === null) setYearFrom(Math.min(...availableYears));
      if (yearTo === null) setYearTo(Math.max(...availableYears));
    }
  }, [availableYears, yearFrom, yearTo, searchMode]);

  const filteredCourses = useMemo(() => {
    let result = courses;

    if (searchMode === "range" && yearFrom !== null && yearTo !== null) {
      result = result.filter((c) => c.year >= yearFrom && c.year <= yearTo);
    }

    if (searchChips.length > 0) {
      // Group chips by type
      const chipsByType = searchChips.reduce(
        (acc, chip) => {
          if (!acc[chip.type]) acc[chip.type] = [];
          acc[chip.type].push(chip);
          return acc;
        },
        {} as Record<string, typeof searchChips>,
      );

      result = result.filter((course) => {
        // For each type: OR logic (any chip of same type can match)
        // Between types: AND logic (all type groups must match)
        return Object.entries(chipsByType).every(([type, chips]) => {
          return chips.some((chip) => {
            const value = chip.value.toLowerCase();
            switch (type) {
              case "code":
                return (course.class_code || course.course_code)
                  ?.toLowerCase()
                  .includes(value);
              case "title":
                return course.title?.toLowerCase().includes(value);
              case "teacher":
                return course.lecturer_name?.toLowerCase().includes(value);
              case "area":
                return course.sub_topics?.some((t) =>
                  t.toLowerCase().includes(value),
                );
              default:
                return true;
            }
          });
        });
      });
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sortColumn) {
          case "code":
            const codeA = a.class_code || a.course_code || "";
            const codeB = b.class_code || b.course_code || "";
            comparison = codeA.localeCompare(codeB);
            break;
          case "title":
            comparison = (a.title || "").localeCompare(b.title || "");
            break;
          case "credits":
            comparison = (a.credits || 0) - (b.credits || 0);
            break;
          case "lecturer":
            comparison = (a.lecturer_name || "").localeCompare(b.lecturer_name || "");
            break;
          case "enrollment":
            comparison = (a.enrolled_count || 0) - (b.enrolled_count || 0);
            break;
          default:
            comparison = 0;
        }
        
        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [courses, searchMode, yearFrom, yearTo, searchChips, sortColumn, sortDirection]);

  // Calculate paginated data
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredCourses.slice(startIndex, endIndex)
  }, [filteredCourses, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  const handleCourseClick = (course: VStudentCourseCatalog) => {
    setSelectedCourse(course);
    setCourseModalOpen(true);
  };

  const handleInstructorClick = (name: string) => {
    setSelectedInstructor(name);
    setInstructorModalOpen(true);
  };

  const handleSort = (column: "code" | "title" | "credits" | "lecturer" | "enrollment") => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to asc
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const formatEnrollmentDisplay = (course: VStudentCourseCatalog) => {
    if (enrollmentDisplayMode === "percentage") {
      const percentage = course.quota_max > 0 
        ? Math.round((course.enrolled_count / course.quota_max) * 100)
        : 0;
      return `${percentage}%`;
    }
    return formatEnrollment(course.enrolled_count, course.quota_min, course.quota_max);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Advanced course management with search and sorting
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Search Mode
            </label>
            <Select
              value={searchMode}
              onValueChange={(v) => setSearchMode(v as SearchMode)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Year</SelectItem>
                <SelectItem value="range">Year Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {searchMode === "single" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Academic Year
                </label>
                <Select
                  value={selectedYear?.toString() || ""}
                  onValueChange={(v) =>
                    setSelectedYear(v ? parseInt(v, 10) : null)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Term</label>
                <Select
                  value={selectedTerm?.toString() || ""}
                  onValueChange={(v) =>
                    setSelectedTerm(v ? parseInt(v, 10) : null)
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTerms.map((term) => (
                      <SelectItem key={term} value={term.toString()}>
                        T{term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  From Year
                </label>
                <Select
                  value={yearFrom?.toString() || ""}
                  onValueChange={(v) => {
                    const newYearFrom = v ? parseInt(v, 10) : null;
                    if (newYearFrom && yearTo && newYearFrom > yearTo) {
                      setYearTo(newYearFrom);
                      toast(`Updated "To Year" to ${newYearFrom}. (Timeline: From Year ≤ To Year)\nNote: End year must be greater than or equal to start year.`);
                    }
                    setYearFrom(newYearFrom);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  To Year
                </label>
                <Select
                  value={yearTo?.toString() || ""}
                  onValueChange={(v) => {
                    const newYearTo = v ? parseInt(v, 10) : null;
                    if (newYearTo && yearFrom && newYearTo < yearFrom) {
                      setYearFrom(newYearTo);
                      toast(
                        <div>
                          ⚠️ Range Correction: Start year reset to {newYearTo}.
                          <br />
                          (Timeline: From Year ≤ To Year)
                          <br />
                          Note: Start year must be less than or equal to end
                          year.
                        </div>,
                      );
                    }
                    setYearTo(newYearTo);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 items-center flex-1">
            <Select
              value={searchType}
              onValueChange={(v) => setSearchType(v as SearchType)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search by ${searchType}... (Enter to add)`}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setAutocompleteOpen(e.target.value.length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput.trim()) {
                    e.preventDefault();
                    addChip(searchInput);
                  }
                  if (e.key === "Escape") {
                    setAutocompleteOpen(false);
                  }
                }}
                onFocus={() => {
                  if (searchInput.length > 0) setAutocompleteOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => setAutocompleteOpen(false), 150);
                }}
                className="pl-9"
              />

              {autocompleteOpen && autocompleteSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addChip(suggestion);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {searchChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchChips.map((chip, index) => (
                <Badge
                  key={index}
                  className={`${SEARCH_TYPE_COLORS[chip.type]} cursor-pointer`}
                  onClick={() => removeChip(index)}
                >
                  {SEARCH_TYPE_LABELS[chip.type]}: {chip.value}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSearchChips([])}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Rows per page selector above table */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              handleItemsPerPageChange(parseInt(value))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">
                    <button
                      onClick={() => handleSort("code")}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Code
                      {sortColumn === "code" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("title")}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Course Title
                      {sortColumn === "title" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px] text-center">
                    <button
                      onClick={() => handleSort("credits")}
                      className="flex items-center justify-center gap-1 hover:text-primary transition-colors"
                    >
                      Credits
                      {sortColumn === "credits" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[180px]">
                    <button
                      onClick={() => handleSort("lecturer")}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Lecturer
                      {sortColumn === "lecturer" && (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px] text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleSort("enrollment")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Enrollment
                        {sortColumn === "enrollment" && (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        )}
                      </button>
                      <button
                        onClick={() => setEnrollmentDisplayMode(
                          enrollmentDisplayMode === "numbers" ? "percentage" : "numbers"
                        )}
                        className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                      >
                        {enrollmentDisplayMode === "numbers" ? "%" : "#"}
                      </button>
                    </div>
                  </TableHead>
                  {searchMode === "range" && (
                    <TableHead className="w-[100px] text-center">
                      Year/Term
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={searchMode === "range" ? 6 : 5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No courses found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCourses.map((course, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCourseClick(course)}
                    >
                      <TableCell className="font-mono font-medium">
                        {course.class_code || course.course_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{course.title}</span>
                          {course.sub_topics &&
                            course.sub_topics.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-2 text-xs text-muted-foreground cursor-help">
                                    ({course.sub_topics.length} topic
                                    {course.sub_topics.length > 1 ? "s" : ""})
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="max-w-xs"
                                >
                                  <div className="flex flex-wrap gap-1">
                                    {course.sub_topics.map((topic, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className={`text-xs ${getTopicColor(topic)}`}
                                      >
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {course.credits}
                      </TableCell>
                      <TableCell>
                        {course.lecturer_name ? (
                          <button
                            className="text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstructorClick(course.lecturer_name);
                            }}
                          >
                            {course.lecturer_name}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">TBA</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatEnrollmentDisplay(course)}
                      </TableCell>
                      {searchMode === "range" && (
                        <TableCell className="text-center text-sm">
                          {course.year} T{course.term}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredCourses.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCourses.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          )}

          <div className="text-sm text-muted-foreground">
            Showing {filteredCourses.length} course
            {filteredCourses.length !== 1 ? "s" : ""}
          </div>
        </>
      )}

      <CourseDetailModal
        course={selectedCourse}
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        onInstructorClick={handleInstructorClick}
      />

      <InstructorDetailModal
        instructorName={selectedInstructor}
        open={instructorModalOpen}
        onOpenChange={setInstructorModalOpen}
      />

      <Toaster richColors position="top-right" />
    </div>
  );
}
