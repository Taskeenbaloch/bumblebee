import { getDefaultParams, engineValid, INIT_PARAMS } from 'bumblebee-utils';

const codeTraceback = (code = '') => `

_use_time = True
try:
    _start_time = datetime.utcnow().timestamp()
except Exception:
    _use_time = False
code = """${code}"""
res = {}
try:
    exec(code, globals())
except Exception as err:
    res.update({'traceback': traceback.format_exc()})
    res.update({'error': str(err)})

res.update({'result': _output})
if _use_time:
    _end_time = datetime.utcnow().timestamp()
    res.update({'_gatewayTime': {'start': _start_time, 'end': _end_time, 'duration': _end_time-_start_time}})
json.dumps(res,  default=_json_default, ensure_ascii=False)
`;
const code = (code = '') => `

_use_time = True
try:
    _start_time = datetime.utcnow().timestamp()
except Exception:
    _use_time = False
${code}
res = {'result': _output}
if _use_time:
    _end_time = datetime.utcnow().timestamp()
    res.update({'_gatewayTime': {'start': _start_time, 'end': _end_time, 'duration': _end_time-_start_time}})
json.dumps(res,  default=_json_default, ensure_ascii=False)
`;

const datasetsMin = (payload) => `
{ _df: globals()[_df].cols.names() for (_df) in ipython_vars(globals(),"dask") }
`;

const datasets = (payload) => `

_use_time = True
try:
    _start_time = datetime.utcnow().timestamp()
except Exception:
    _use_time = False

if ipython_vars:
    _dfs = ipython_vars(globals(),"dask")
else:
    _dfs = []

if _use_time:
    _end_time = datetime.utcnow().timestamp()
    res = { _df: globals()[_df].cols.names() for (_df) in _dfs }
res.update({'_gatewayTime': {'start': _start_time, 'end': _end_time, 'duration': _end_time-_start_time}})
json.dumps(res,  default=_json_default, ensure_ascii=False)
`;

const initializationParameters = ( params: any = {} ) => {
  let str = ''

  Object.entries(params).forEach(([key, value]: [string, any])=>{

    if (value!==undefined && INIT_PARAMS[key] && engineValid(key, params.engine)) {

      switch (INIT_PARAMS[key].type) {
        case 'int':
          str += `, ${key}=${+value}`;
          break;

        case 'const':
          str += `, ${key}=${value}`;
          break;

        case 'string':
          str += `, ${key}="${value}"`;
          break;

        case 'boolean':
          str += `, ${key}=${(value && value!=0 && value!='false') ? 'True' : 'False'}`;
          break;

        case 'int array':
          str += `, ${key}=[${value.map(v=>+v).join(', ')}]`;
          break;

        case 'const array':
          str += `, ${key}=[${value.map(v=>v).join(', ')}]`;
          break;

        case 'string array':
          str += `, ${key}=["${value.join('", "')}"]`;
          break;

        case 'boolean array':
          str += `, ${key}=["${value.map(v=>(v && v!=0 && v!='false') ? 'True' : 'False').join('", "')}"]`;
          break;

        case 'dict':
          str += `, ${key}={${Object.entries(value).map(([key, v]: [string, string])=>`"${key}": "${v}"`).join(', ')}}`;
          break;

        case 'kwargs':
          str += `, ${Object.entries(value).map(([key, v]: [string, string])=>`${key}="${v}"`).join(', ')}`;
          break;

      }
    }


  });

  return str;
}

const getParams = payload => {
  let params = {...(payload || {})};

  params = getDefaultParams(params)

  let functionParams = initializationParameters(params);

  switch (params.engine) {
    case 'dask_coiled':
      params.coiled = true;
      params.engine = 'dask';
      break
    case 'dask_cudf_coiled':
      params.coiled = true;
      params.engine = 'dask_cudf';
      break
  }

  return { params, functionParams };
}

const init = (payload, min = false) => {

  let { params, functionParams } = getParams(payload);

  let opInit = '';

  opInit = `
engine = "${params.engine}"
if (using_coiled):
    coiled.create_cluster_configuration(${functionParams.substr(2)})
    cluster = coiled.Cluster(name="${params.workspace_name}", configuration='${params.name}')
    client = Client(cluster)
    client_install = client.run(install)
    op = Optimus(engine, session=client, memory_limit="1G", comm=True)
else:
    op = Optimus(engine${functionParams}, memory_limit="1G", comm=True)
`

  if (min) {
    return opInit;
  }

  return `

def install ():
    from optimus import Optimus
    return 'ok'

reset = ${(params?.reset != '0') ? 'True' : 'False'}

try:
    json; date; datetime; ipython_vars; _json_default; traceback;
    assert (not reset)
except Exception:
    reset = True
    from datetime import datetime, date
    try:
        from optimus.helpers.functions import ipython_vars
    except Exception:
        ipython_vars = False
    import traceback
    import json
    def _json_default(o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()

_use_time = True
try:
    _start_time = datetime.utcnow().timestamp()
except Exception:
    _use_time = False

res = { 'kernel': 'ok' }

engine = "${params.engine}"

using_coiled = False
coiled_available = False

# check coiled availability

import cytoolz;

try:
    import coiled;
    coiled.Cloud()
    coiled_available = True
    using_coiled = ${params.coiled ? 'True' : 'False'}
except:
    using_coiled = False
    coiled_available = False

# check optimus parser availability

try:
    from optimus.expressions import reserved_words, Parser
    res.update({'reserved_words': reserved_words})
    p = Parser()
except:
    def p (a):
        return a

# initialization

from optimus import Optimus
from dask.distributed import Client;
${opInit}
if (using_coiled):
    res.update({"coiled": True, "cluster_name": cluster.name, "dashboard_link": client.dashboard_link, "client_install": client_install});
res.update({'optimus': 'ok init', 'optimus_version': op.__version__, 'engine': op.engine, "coiled_available": coiled_available});

if _use_time:
    _end_time = datetime.utcnow().timestamp()
    res.update({'_gatewayTime': {'start': _start_time, 'end': _end_time, 'duration': _end_time-_start_time}})

json.dumps(res,  default=_json_default, ensure_ascii=False)
`;
}

export default { init, datasets, code, datasetsMin };
