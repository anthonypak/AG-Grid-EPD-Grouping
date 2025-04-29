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
  ClientSideRowModelModule,
  ColDef,
  ColGroupDef,
  GridApi,
  GridOptions,
  ModuleRegistry,
  ValidationModule,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  RowSelectionModule,
} from "ag-grid-community";
import { LicenseManager, RowGroupingModule, MenuModule, ColumnsToolPanelModule, RowGroupingPanelModule } from "ag-grid-enterprise";

// Add missing Supabase import
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khxbcgqtjvomylwvnwta.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeGJjZ3F0anZvbXlsd3Zud3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODM5MDgsImV4cCI6MjA2MTQ1OTkwOH0.OprhgtAk4uvRc37yhPZkj0UkGNK5YTjzLI1IY_gikVc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

LicenseManager.setLicenseKey("[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-086015}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{14 May 2025}____[v3]_[0102]_MTc0NzE3NzIwMDAwMA==1127112b2eb5fda550f75b9d26691ef0");

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ValidationModule /* Development Only */,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  RowGroupingModule,
  MenuModule,
  RowSelectionModule,
  ColumnsToolPanelModule,
  RowGroupingPanelModule,
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    };
  }, []);

  const autoGroupColumnDef = useMemo<ColDef>(() => {
    return {
      headerName: 'Material Group',
      minWidth: 250,
      field: 'Product Name',
      cellRenderer: 'agGroupCellRenderer',
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      console.log('Fetching data from Supabase EPD table...');
      const { data, error, count } = await supabase
        .from('EPD')
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Supabase fetch error:', error);
        setError(`Failed to load data: ${error.message}`);
        setRowData([]);
      } else if (data) {
        console.log(`Supabase fetch success: Received ${data.length} rows.`);
        console.log('First row data:', data.length > 0 ? data[0] : 'N/A');
        console.log(`Total row count from Supabase: ${count}`);
        setRowData(data);
      } else {
        console.log('Supabase fetch returned no data and no error.');
        setRowData([]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={containerStyle}>Loading EPD data from Supabase...</div>;
  }

  if (error) {
    return <div style={containerStyle}>Error: {error}</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className="ag-theme-quartz">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: true,
            enableClickSelection: false,
            groupSelects: 'descendants',
          }}
          rowGroupPanelShow={'always'}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[10, 25, 50, 100]}
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
