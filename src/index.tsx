"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  StrictMode,
  useEffect,
} from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ColGroupDef,
  GridApi,
  GridOptions,
  ModuleRegistry,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  TextFilterModule,
  NumberFilterModule,
  RowSelectionModule,
} from "ag-grid-community";
import {
  LicenseManager,
  RowGroupingModule,
  MenuModule,
  ColumnsToolPanelModule,
  RowGroupingPanelModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

// Add missing Supabase import
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khxbcgqtjvomylwvnwta.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeGJjZ3F0anZvbXlsd3Zud3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODM5MDgsImV4cCI6MjA2MTQ1OTkwOH0.OprhgtAk4uvRc37yhPZkj0UkGNK5YTjzLI1IY_gikVc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

LicenseManager.setLicenseKey("[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-086015}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{14 May 2025}____[v3]_[0102]_MTc0NzE3NzIwMDAwMA==1127112b2eb5fda550f75b9d26691ef0");

ModuleRegistry.registerModules([
  ServerSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  RowGroupingModule,
  MenuModule,
  RowSelectionModule,
  ColumnsToolPanelModule,
  RowGroupingPanelModule,
]);

// --- Column Mapping --- 
// Maps AG-Grid field names to exact (quoted) Supabase column names
const columnMapping: { [key: string]: string } = {
  'Masterformat': '"Masterformat"',
  'Material Category': '"Material Category"',
  'Material Subcategory': '"Material Subcategory"',
  'Country': '"Country"', // Quote even simple names for consistency
  'Datapoint Type': '"Datapoint Type"',
  'Plant Name': '"Plant Name"',
  'Manufacturer': '"Manufacturer"',
  'Default Unit': '"Default Unit"',
  'Product Name': '"Product Name"',
  'Product Description': '"Product Description"',
  'EC3 Uncertainty Factor (%)': '"EC3 Uncertainty Factor (%)"',
  'GWP Fossil + Biogenic (kgCO2e)': '"GWP Fossil + Biogenic (kgCO2e)"',
  'GWP per Default Unit': '"GWP per Default Unit"',
  'GWPbio per Default Unit': '"GWPbio per Default Unit"',
  // Add any other relevant columns here if used in filters/sorts/groups
  // Make sure the keys exactly match the 'field' property in your columnDefs
};

// Helper to get the DB column name from AG-Grid field
const getDbColumnName = (agGridField: string): string => {
  // Attempt to find in mapping, default to quoting the input field name
  // It's safer to ensure all mapped columns are explicitly in columnMapping
  const mappedName = columnMapping[agGridField];
  if (!mappedName) {
      console.warn(`Column field '${agGridField}' not found in columnMapping. Attempting to quote directly. Add it to the mapping for reliability.`);
      // Basic quoting - might fail for complex names not intended
      return `"${agGridField}"`; 
  }
  return mappedName;
};

// Helper function to map AG-Grid filter types to Supabase filters
const applyFilters = (query: any, filterModel: any) => {
  if (!filterModel || Object.keys(filterModel).length === 0) {
    return query; // No filters applied
  }

  console.log("Applying filters:", filterModel);

  Object.keys(filterModel).forEach(colId => {
    const filter = filterModel[colId];
    // IMPORTANT: Use the mapping here!
    const columnName = getDbColumnName(colId);
    if (!columnName) return; // Skip if column name couldn't be resolved

    // Handle combined filters (AND/OR) - AG Grid usually sends simple filters per column
    // or condition filters. We'll handle the simple case first.
    if (filter.operator) {
        console.warn(`Filter operator ${filter.operator} not fully implemented yet.`);
        // Basic AND handling for two conditions
        if (filter.operator === 'AND' && filter.condition1 && filter.condition2) {
             // Apply condition 1 (recursive or direct call might be needed)
             // Apply condition 2
        } else if (filter.operator === 'OR' && filter.condition1 && filter.condition2) {
             // Needs Supabase .or() syntax
        }
        // For now, only process simple filters
        return;
    }

    switch (filter.filterType) {
      case 'text':
        // Use ilike for case-insensitive matching
        switch (filter.type) {
          case 'contains':
            query = query.ilike(columnName, `%${filter.filter}%`);
            break;
          case 'notContains':
            // Supabase doesn't have a direct 'not ilike'. Combine 'not' and 'ilike'.
            query = query.not('ilike', columnName, `%${filter.filter}%`);
            break;
          case 'equals':
            query = query.eq(columnName, filter.filter);
            break;
          case 'notEqual':
            query = query.neq(columnName, filter.filter);
            break;
          case 'startsWith':
            query = query.ilike(columnName, `${filter.filter}%`);
            break;
          case 'endsWith':
             query = query.ilike(columnName, `%${filter.filter}`);
            break;
          default:
            console.warn(`Unsupported text filter type: ${filter.type} for column ${columnName}`);
        }
        break;

      case 'number':
        const numValue = Number(filter.filter);
         if (isNaN(numValue)) {
            console.warn(`Invalid number filter value for ${columnName}: ${filter.filter}`);
            break;
         }
        switch (filter.type) {
          case 'equals':
            query = query.eq(columnName, numValue);
            break;
          case 'notEqual':
            query = query.neq(columnName, numValue);
            break;
          case 'lessThan':
            query = query.lt(columnName, numValue);
            break;
          case 'lessThanOrEqual':
            query = query.lte(columnName, numValue);
            break;
          case 'greaterThan':
            query = query.gt(columnName, numValue);
            break;
          case 'greaterThanOrEqual':
            query = query.gte(columnName, numValue);
            break;
          case 'inRange':
             const numValueTo = Number(filter.filterTo);
             if (isNaN(numValueTo)) {
                console.warn(`Invalid number filter 'to' value for ${columnName}: ${filter.filterTo}`);
                break;
             }
            query = query.gte(columnName, numValue).lte(columnName, numValueTo);
            break;
          default:
            console.warn(`Unsupported number filter type: ${filter.type} for column ${columnName}`);
        }
        break;
      
      // Add 'set' filter support if using agSetColumnFilter
      case 'set':
         if (filter.values && Array.isArray(filter.values) && filter.values.length > 0) {
             query = query.in(columnName, filter.values);
         } else {
             console.warn(`Invalid set filter values for ${columnName}:`, filter.values);
         }
         break;

      default:
        console.warn(`Unsupported filter type: ${filter.filterType} for column ${columnName}`);
    }
  });

  return query;
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const gridRef = useRef<AgGridReact>(null);

  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    { field: 'Masterformat', headerName: 'Masterformat', filter: true, sortable: true, enableRowGroup: true },
    { field: 'Material Category', headerName: 'Material Category', filter: true, sortable: true, enableRowGroup: true },
    { field: 'Material Subcategory', headerName: 'Material Subcategory', filter: true, sortable: true, enableRowGroup: true },
    { field: 'Country', headerName: 'Country', filter: true, sortable: true, enableRowGroup: true },
    { field: 'Datapoint Type', headerName: 'Datapoint Type', filter: true, sortable: true, enableRowGroup: true },
    { field: 'Plant Name', headerName: 'Plant Name', filter: true, sortable: true },
    { field: 'Manufacturer', headerName: 'Manufacturer', filter: true, sortable: true },
    { field: 'Default Unit', headerName: 'Default Unit', filter: true, sortable: true },
    { field: 'Product Name', headerName: 'Product Name', filter: true, sortable: true },
    { field: 'Product Description', headerName: 'Product Description', filter: true, sortable: true },
    { field: 'EC3 Uncertainty Factor (%)', headerName: 'EC3 Uncertainty (%)', filter: 'agNumberColumnFilter', sortable: true },
    { field: 'GWP Fossil + Biogenic (kgCO2e)', headerName: 'GWP Total (kgCO2e)', filter: 'agNumberColumnFilter', sortable: true },
    { field: 'GWP per Default Unit', headerName: 'GWP / Unit', filter: 'agNumberColumnFilter', sortable: true },
    { field: 'GWPbio per Default Unit', headerName: 'GWP Biogenic / Unit', filter: 'agNumberColumnFilter', sortable: true },
  ]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      flex: 1,
      minWidth: 150,
      resizable: true,
      sortable: true,
      filter: true,
    };
  }, []);

  const autoGroupColumnDef = useMemo<ColDef>(() => {
    return {
      headerName: 'Material Group',
      minWidth: 250,
      field: 'Product Name',
      cellRendererParams: {
        suppressCount: true,
      },
    };
  }, []);

  const serverSideDatasource = useMemo<IServerSideDatasource>(() => {
    return {
      getRows: async (params: IServerSideGetRowsParams) => {
        console.log('[ServerSideDatasource] Requesting rows:', params.request);
        const { startRow, endRow, sortModel, filterModel, rowGroupCols, groupKeys } = params.request;

        // Determine if it's a group request or leaf request
        const isGrouping = rowGroupCols.length > groupKeys.length;

        // Apply parent group filters (applies to both group and leaf requests within a group)
        const applyParentFilters = (currentQuery: any) => {
            console.log("[Debug] applyParentFilters called with Group Keys:", groupKeys);
            console.log("[Debug] Initial currentQuery type:", typeof currentQuery, "Has .eq?", typeof currentQuery?.eq === 'function');
            let filteredQuery = currentQuery;
            groupKeys.forEach((key, index) => {
                const colId = rowGroupCols[index].id;
                const dbColName = getDbColumnName(colId); // Use mapped name
                if (!dbColName) {
                    console.warn(`[Debug] Skipping parent filter for unmapped column: ${colId}`);
                    return; // Continue to next key
                }

                console.log(`[Debug] Applying parent filter: ${dbColName} eq ${key}`);
                // --- Debugging Check --- 
                if (typeof filteredQuery?.eq !== 'function') {
                    console.error(`[Debug] Error: filteredQuery is not a valid query object before applying .eq('${dbColName}', '${key}')!`, filteredQuery);
                    // To prevent crash, maybe return the current object or throw
                    // For now, let's skip this filter to see if others work
                    console.error('[Debug] Skipping this filter application due to invalid query object.');
                    return; // Continue to next key, though the query might be broken
                } 
                // --- End Debugging Check ---
                
                try {
                    filteredQuery = filteredQuery.eq(dbColName, key); 
                    console.log("[Debug] filteredQuery type after .eq:", typeof filteredQuery, "Has .eq?", typeof filteredQuery?.eq === 'function');
                } catch (e) {
                    console.error(`[Debug] Error during filteredQuery.eq(${dbColName}, ${key}):`, e);
                    console.error('[Debug] Query object state was:', filteredQuery);
                    // Rethrow or handle as needed
                    throw e; 
                }
            });
            console.log("[Debug] applyParentFilters returning query:", filteredQuery);
            return filteredQuery;
        }

        if (isGrouping) {
            // --- Request for Group Rows --- 
            const groupingColId = rowGroupCols[groupKeys.length].id;
            const dbGroupingColName = getDbColumnName(groupingColId); // Use mapped name
            if (!dbGroupingColName) {
                console.error(`Cannot perform grouping for unmapped column field: ${groupingColId}`);
                params.fail();
                return;
            }
            console.log(`[ServerSideDatasource] Requesting GROUP level ${groupKeys.length} for column: ${dbGroupingColName} (using RPC)`);
            
            // --- RPC-Based Group Fetching --- 
            try {
                // 1. Prepare Parent Filters for RPC
                const parentFiltersObject: { [key: string]: any } = {};
                groupKeys.forEach((key, index) => {
                    const parentColId = rowGroupCols[index].id;
                    const parentDbColName = getDbColumnName(parentColId);
                    if (parentDbColName) {
                        parentFiltersObject[parentDbColName] = key; // Use DB name as key
                    }
                });

                // 2. Prepare Column Filters (Simplified for V1 - passing empty object)
                // TODO: Enhance SQL function and this part to handle column filters if needed
                const columnFiltersObject = {}; // Pass empty for V1
                
                console.log(`Calling RPC get_distinct_groups_v1 with:`, {
                     grouping_column: dbGroupingColName,
                    // parent_filters: parentFiltersObject // Temporarily removed for v1.9
                    // column_filters: columnFiltersObject // Future enhancement
                 });

                // 3. Call the Supabase RPC function
                const { data: rpcData, error: rpcError } = await supabase.rpc(
                    'get_distinct_groups_v1', 
                    { // Pass ONLY grouping_column for v1.9
                        grouping_column: dbGroupingColName
                        // parent_filters: parentFiltersObject // Temporarily removed for v1.9
                        // Pass column_filters here when implemented
                    }
                );

                if (rpcError) throw rpcError;

                // 4. Process RPC results
                const distinctGroups = (rpcData || []).map((item: any) => {
                    // The RPC returns { group_value: <actual_value> }
                    // We need to map it back to { [agGridField]: <actual_value> }
                    return { [groupingColId]: item.group_value }; 
                }).filter(group => group[groupingColId] !== null && group[groupingColId] !== undefined);

                console.log(`RPC returned ${distinctGroups.length} distinct groups for ${dbGroupingColName}`);
                
                // We now know the exact count of distinct groups for this level
                params.success({ rowData: distinctGroups, rowCount: distinctGroups.length }); 

            } catch (err) {
                console.error(`Error fetching GROUP data via RPC for ${dbGroupingColName}:`, err);
                params.fail();
            }
            // --- End RPC-Based Group Fetching --- 

        } else {
            // --- Request for Leaf Rows --- 
            console.log('[ServerSideDatasource] Requesting LEAF rows within group:', groupKeys);
            
            // Select first, then apply filters
            let leafQueryBase = supabase.from('EPD').select('*', { count: 'exact' }); // SELECT * + count first
            leafQueryBase = applyParentFilters(leafQueryBase); // Apply filters from parent groups
            // Apply regular column filters
            let leafQuery = applyFilters(leafQueryBase, filterModel); // Apply column filters

            // Apply sorting
            if (sortModel && sortModel.length > 0) {
                sortModel.forEach(s => {
                    const dbSortColName = getDbColumnName(s.colId); // Use mapped name
                    if(dbSortColName) {
                      leafQuery = leafQuery.order(dbSortColName, { ascending: s.sort === 'asc' });
                    }
                });
            } else {
                // Optional default sort for leaf rows
                // const defaultSortCol = getDbColumnName('id'); // Example using mapped default
                // if(defaultSortCol) leafQuery = leafQuery.order(defaultSortCol, { ascending: true }); 
            }

            // Apply pagination (range)
            const startRow = params.request.startRow ?? 0;
            const endRow = params.request.endRow ?? startRow + 100; // Use cacheBlockSize for default range
            const pageSize = endRow - startRow;
            leafQuery = leafQuery.range(startRow, endRow - 1); // Supabase range is inclusive

            console.log(`Executing Supabase LEAF query: range(${startRow}, ${endRow - 1})`, { groupKeys, sortModel, filterModel });

            try {
                const { data, error, count } = await leafQuery;

                if (error) throw error;

                const rowsThisPage = data || [];
                // Use the 'count' from the query for total rows in this group/level
                const totalRowCount = count ?? 0;

                console.log(`Supabase LEAF fetch success: Received ${rowsThisPage.length} rows. Total count for group: ${totalRowCount}`);

                // Calculate the last row index based on the count
                const lastRow = totalRowCount <= endRow ? totalRowCount : -1; // -1 indicates more rows exist

                params.success({ rowData: rowsThisPage, rowCount: lastRow });
            } catch (err) {
                console.error('Error fetching LEAF data:', err);
                params.fail();
            }
        }
      },
    };
  }, [supabase, columnDefs, defaultColDef, autoGroupColumnDef]); // Ensure all dependencies used in getRows are listed

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className="ag-theme-quartz">
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          rowModelType="serverSide"
          serverSideDatasource={serverSideDatasource}
          rowGroupPanelShow={'always'}
          cacheBlockSize={100}
          maxBlocksInCache={10}
        />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>,
);
