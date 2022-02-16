import copy

from optimus.helpers.constants import ProfilerDataTypes    


def one_dict_to_val(val):
    if isinstance(val, dict) and len(val) == 1:
        return list(val.values())[0]
    return val


def replace_data_type(a, b):
    data_types = ProfilerDataTypes.list()
    a_index = [i for i, dt in enumerate(data_types) if dt == a][0] or len(data_types)
    b_index = [i for i, dt in enumerate(data_types) if dt == b][0] or len(data_types)
    index = min(a_index, b_index)
    return data_types[index] if index < len(data_types) else None


def add_profile(a, b):
    a = copy.deepcopy(a)

    if b is None or len(b) == 0:
        return a

    if "columns" not in a:
        a.update({"columns": {}})
    
    if "columns" not in b:
        b.update({"columns": {}})
    
    columns_keys = set(list(a["columns"].keys()) + list(b["columns"].keys()))
    
    for col in columns_keys:
        if col in a["columns"] and col in b["columns"]:
            if b["columns"][col].get("last_sampled_row", 0) >= a["columns"][col].get("last_sampled_row", -1):
                continue
            a["columns"][col]["stats"]["match"] += b["columns"][col]["stats"]["match"]
            a["columns"][col]["stats"]["missing"] += b["columns"][col]["stats"]["missing"]
            a["columns"][col]["stats"]["mismatch"] += b["columns"][col]["stats"]["mismatch"]
            a_data_type = a["columns"][col]["stats"]["inferred_data_type"]["data_type"]
            b_data_type = b["columns"][col]["stats"]["inferred_data_type"]["data_type"]
            a["columns"][col]["stats"]["inferred_data_type"]["data_type"] = replace_data_type(a_data_type, b_data_type)
        if col in b["columns"] and col not in a["columns"]:
            a["columns"].update({col: b["columns"][col]})
    
    del a["summary"]["rows_count"]
    del a["summary"]["missing_count"]
    del a["summary"]["p_missing"]
    a["summary"]["data_types_list"] = list(set(a["summary"]["data_types_list"] + b["summary"]["data_types_list"]))
    a["summary"]["total_count_data_types"] = len(a["summary"]["data_types_list"])
    return a


def add_to_table(table, add):
    table = table.add(add, fill_value=0) if table is not None else add
    table["count"] = table["count"].astype("int64")
    return table
    

def output_table(table, limit=None):
    table = table.sort_values(by="count", ascending=False).reset_index()
    if limit is not None:
        table = table[0:limit]
    return {"values": table.to_dict('records')}


def output_hist(hist, limit=None):
    hist = hist.reset_index()
    return hist.to_dict('records')


def table_to_pandas(table, index="value"):
    import pandas as pd
    return pd.DataFrame.from_dict(table).set_index(index)


def hist_to_pandas(hist, indices=["lower", "upper"]):
    import pandas as pd
    return pd.DataFrame.from_dict(hist).set_index(indices)


def set_patterns_meta(df, column_name, result, n=10):
    from optimus.engines.base.meta import Meta
    import time
    more = False
    if not isinstance(result, dict):
        more = len(result) > n
        result = output_table(result, n)
    result.update({"more": more, "updated": time.time()})
    df.meta = Meta.set(df.meta, f"profile.columns.{column_name}.patterns", result)
    return df


def inject_method_to_optimus(func):
    func_name = func.__name__
    _func_split = func_name.split("__")
    
    if len(_func_split) == 3:
        func_type, accessor, method_name = _func_split
    elif len(_func_split) == 2:
        func_type, method_name = _func_split
        accessor = None
    else:
        raise TypeError(f"Wrong name '{func_name}', must have the form 'type__accessor__name'")
       
    from optimus.engines.base.basedataframe import BaseDataFrame
    from optimus.engines.base.columns import BaseColumns
    from optimus.engines.base.rows import BaseRows
    
    from optimus.engines.base.engine import BaseEngine
    from optimus.engines.base.create import BaseCreate
    
    _cls = None
    
    if func_type == "df":
        if accessor == "cols":
            _cls = BaseColumns
        elif accessor == "rows":
            _cls = BaseRows
        else:
            _cls = BaseDataFrame
            
    elif func_type == "op":
        if accessor == "create":
            _cls = BaseCreate
        else:
            _cls = BaseEngine
            
    if _cls is None:
        raise TypeError(f"Wrong name '{func_name}', must have the form 'type__accessor__name'")
            
    if _cls in [BaseDataFrame, BaseEngine]:
        def binded(self, *args, **kwargs):
            _df = self
            return func(_df, *args, **kwargs)
        
    else:
        def binded(self, *args, **kwargs):
            _df = self.root
            return func(_df, *args, **kwargs)
    
    setattr(_cls, method_name, binded)
    return True
