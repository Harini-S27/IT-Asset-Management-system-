import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  pagination?: boolean;
}

interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  enableSorting?: boolean;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onRowClick,
  searchable = true,
  pagination = true,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const itemsPerPage = 5;

  // Handle search filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;
    
    return data.filter((item) => {
      return Object.values(item).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [data, searchQuery]);

  // Handle pagination
  const paginatedData = React.useMemo(() => {
    if (!pagination) return filteredData;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, pagination]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, filteredData.length);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set<number>();
      paginatedData.forEach(item => newSelected.add(item.id));
      setSelectedRows(newSelected);
    } else {
      setSelectedRows(new Set());
    }
  };

  // Handle individual row selection
  const handleSelectRow = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  // Check if all visible rows are selected
  const allSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedRows.has(item.id));

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative w-96">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="h-12">
              <TableHead className="w-16 px-6">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {columns.map((column, index) => (
                <TableHead key={index} className="px-6 py-3 font-semibold text-gray-700">
                  <div className="flex items-center">
                    {column.header}
                    {column.enableSorting && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="ml-1.5 h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 9l-7 7-7-7" 
                        />
                      </svg>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-gray-500 text-lg">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow 
                  key={row.id}
                  className={`h-16 ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={(e) => {
                    // Only trigger row click if not clicking on dropdown or buttons
                    if (
                      !(e.target as HTMLElement).closest('.dropdown-trigger') &&
                      !(e.target as HTMLElement).closest('button')
                    ) {
                      onRowClick && onRowClick(row);
                    }
                  }}
                >
                  <TableCell className="px-6 py-4">
                    <Checkbox 
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={(checked) => {
                        handleSelectRow(row.id, checked === true);
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when checking
                    />
                  </TableCell>
                  {columns.map((column, index) => (
                    <TableCell key={index} className="px-6 py-4">
                      {column.cell 
                        ? column.cell(row) 
                        : row[column.accessorKey as keyof T] as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500 text-center sm:text-left">
            Showing <span className="font-medium">{startIndex}</span> to{" "}
            <span className="font-medium">{endIndex}</span> of{" "}
            <span className="font-medium">{filteredData.length}</span> results
          </p>
          
          {/* Mobile-first pagination */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Mobile: Simple Previous/Next with page info */}
            <div className="flex items-center gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </Button>
              <span className="text-sm text-neutral-500 px-2">
                {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
            
            {/* Desktop: Full pagination */}
            <div className="hidden sm:flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {/* Smart pagination logic for desktop */}
              {(() => {
                const pages = [];
                const maxVisiblePages = 3; // Reduced for better mobile fit
                
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                // Adjust start if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                // Show first page if there's a gap
                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                    >
                      1
                    </Button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="start-ellipsis" className="px-1 text-sm text-neutral-500">
                        ...
                      </span>
                    );
                  }
                }
                
                // Show visible pages
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                    >
                      {i}
                    </Button>
                  );
                }
                
                // Show last page if there's a gap
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="end-ellipsis" className="px-1 text-sm text-neutral-500">
                        ...
                      </span>
                    );
                  }
                  
                  pages.push(
                    <Button
                      key={totalPages}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  );
                }
                
                return pages;
              })()}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
