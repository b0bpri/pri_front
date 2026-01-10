<script setup>
import {computed, onMounted, ref} from 'vue';
import { Timeline } from 'vue-timeline-chart';
import 'vue-timeline-chart/style.css';
import axios from 'axios';
import { useRouter } from 'vue-router';
import authStore from '/src/stores/authStore.js';
import ToggleTextBox from '@/components/ToggleTextBox.vue';

const router = useRouter();
const dateFlag = ref(null); //flag to determine which year to display

const props = defineProps({
  thesisId: {
    type: String,
    required: true
  }
});

const timelineRef = ref(null);
const error = ref(null);
const timelineData = ref(null);
const defenceDateData = ref(null);

const fetchTimeline = async () => {
  try {
    console.log('Fetching timeline for thesis ID:', props.thesisId);
    
    // Fetch the timeline using the thesis ID
    const response = await axios.get(`/api/v1/timeline/view/byThesisId/${props.thesisId}`);
    console.log('Timeline response:', response.data);
    if (!response.data) {
      console.error('No timeline data returned for thesis ID:', props.thesisId);
      error.value = 'No timeline data available';
      return;
    }

    const defenceDateResponse = await axios.get(`/api/v1/chapter/getDefence/${props.thesisId}`);
    console.log('Defence date response:', defenceDateResponse.data);
    if (!defenceDateResponse.data) {
      console.error('No defence date data returned for thesis ID:', props.thesisId);
      error.value = 'No defence date data available';
      return;
    }
    
    timelineData.value = response.data;
    console.log('Timeline data loaded:', timelineData.value);
    defenceDateData.value = defenceDateResponse.data;
    console.log('Defence date data loaded:', defenceDateData.value);
    
    // After data is loaded, process it
    if (timelineData.value) {
      processDataEntries();
    }
  } catch (err) {
    error.value = 'Failed to fetch timeline data';
    console.error('Error fetching timeline:', err);
  }
};

const groups = ref([]);
const items = ref([]);
const mouseHoverPosition = ref(null);
//Variable tracking which timeline Event was clicked
const selectedItem = ref(null);
//Variable tracking which JSON entry matches to the clicked timeline event
const matched_json_chapter = ref(null);
const matched_json_version = ref(null);
const infoCardRef = ref(null);

const markers = computed(() => {
  return [mouseHoverPosition.value ? {
    start: mouseHoverPosition.value,
    type: 'marker',
    id: 'mousehover',
  } : null].filter(Boolean);
});

function onMousemoveTimeline ({ time }) {
  mouseHoverPosition.value = time;
}
function onMouseleaveTimeline () {
  mouseHoverPosition.value = null;
}

//Goes through acquired JSON and using pushItem and pushGroup, populates Vue Timeline Chart arrays. Is booted on app mount.
function processDataEntries() {
  if (!timelineData.value) {
    console.error('Timeline data is not available');
    error.value = 'Timeline data is not available';
    return;
  }

  const thesis_supervisor_id = timelineData.value.supervisor_user_data_id;
  //Test Entry to test supervisor status. Other timeline entries do not react to it, as they react strictly to entries in timelineData
  //pushItem(items, 999, 28, 1756737432000, 'Testname', 'Testcomment', 'Testtally', 'status-supervisor')
  timelineData.value.chapters.forEach(chapter => {
    const author_id = chapter.author.user_data_id;
    const author_name = `${chapter.author.user_data_first_name} ${chapter.author.user_data_last_name}`;
    let was_reviewed = null;
    if (!groupExistsAlready(groups, author_id)) {
      pushGroup(groups, author_id, author_name);
    }

    [...chapter.versions].reverse().forEach(version => {
      if (!itemExistsAlready(items, version.id, author_id)) {
        let status = null;
        let score = null;
        if (isSupervisor(thesis_supervisor_id, version.uploader.user_data_id)) {
          was_reviewed = 1;
          status = 'status-supervisor';
          score = version.checklist_tally.resolved + '/' + version.checklist_tally.total;
          //console.log('Score is:', score);

        }
        else {
          if (was_reviewed === 1) {
            status = 'status-student-reviewed';
          }
          else {
            status = 'status-student-pending';
          }
        }
        if (!dateFlag.value){
          dateFlag.value = Date.parse(version.upload_date_time);
          //console.log("Dateflag is", dateFlag.value);
          //console.log("Year is", new Date(dateFlag.value).getFullYear());
          //console.log("Month is", new Date(dateFlag.value).getMonth());
        }

        pushItem(
            items,
            version.id,
            author_id,
            Date.parse(version.upload_date_time),
            `${version.uploader.user_data_first_name} ${version.uploader.user_data_last_name}`,
            version.supervisor_comment,
            score,
            status
        );
      }
    });
  });
  //console.log('BEFORE TRYING TO ADD DEFENCE DATE');
  if (defenceDateData.value) {
    //console.log('TRYING TO ADD DEFENCE DATE');
    const defenseDate = Date.parse(defenceDateData.value.date);
    const defenseComment = defenceDateData.value.comment || 'Thesis Defense';

    groups.value.forEach(group => {
      pushItem(
          items,
          `defense-${group.id}`,  // Unique ID for each defense item
          group.id,  // Group ID
          defenseDate,
          'Supervisor',
          defenseComment,
          null,
          'status-defence-date'
      );
    });
  }
}
//FIX: This should be passing a version object, instead of two IDs
function isSupervisor(supervisor_id, version_uploader_id){
  if (supervisor_id === version_uploader_id) {
    //console.log('This is a Supervisor');
    return 'true';
  }
}

//FIX: This should be two separate functions, not a two-in-one
function matchChapterAndVersion(combined_id, entry_date) {
  const [version_id, group_id] = combined_id.split('-');
  for (const chapter of timelineData.value.chapters) {
    if (chapter.author.user_data_id.toString() !== group_id) continue;
    console.log('Chapter being checked:', chapter);

    const version = chapter.versions.find(version =>
        version.id.toString() === version_id &&
        new Date(version.upload_date_time).getTime() === entry_date
    );

    if (version) {
      matched_json_chapter.value = {...chapter};
      matched_json_version.value = {...version};
      break;
    }
  }

  console.log('Final match:', {
    chapter: matched_json_chapter.value,
    version: matched_json_version.value
  });
}
//Populates the Vue Timeline Chart's 'items' array with entries
function pushItem(items_array_ref, version_id, group_id, date, uploadedBy, comment, score, status) {
  const newItem = {
    id: `${version_id}-${group_id}`,
    group: group_id,
    type: 'point',
    start: date,
    uploadedBy: uploadedBy,
    comment: comment,
    tally: score,
    className: status
  };
  console.log('Adding item:', newItem);
  items_array_ref.value.push(newItem);
}
function itemExistsAlready(array_to_check, item_id, group_id){
  return array_to_check.value.some(item => item.id === `${item_id}-${group_id}`);
}
//Populates the Vue Timeline Chart's 'group' array with entries
function pushGroup (group_array_ref, student_id, name_of_student){
  group_array_ref.value.push({
    id: student_id,
    label: name_of_student
  });
  console.log('Adding group:', {
    id: student_id,
    label: name_of_student
  });
}
function groupExistsAlready(array_to_check, item_id){
  return array_to_check.value.some(item => item.id === `${item_id}`);
}
//Function called when clicking a timeline event. Goes through JSON to find matching entry and saves it to variable matched_json_entry
function displayItemInformation(event) {
  // Check if timeline event exists and if it has data
  if (event && event.item) {
    selectedItem.value = event.item;
    console.log('Event item is: ', event.item);
    console.log('Event item start is: ', event.item.start);
    //Find JSON entry which matches timeline event
    matchChapterAndVersion(event.item.id, event.item.start);
  }
}

function goBack() {
  router.push('/groups-panel');
}

const timelineRange = computed(() => {
  const currentYear = new Date().getFullYear();
  let beginningDate = new Date(currentYear - 1, 9, 1).getTime();
  let endingDate = new Date(currentYear, 2, 28).getTime();

  if (dateFlag.value) {
    const entryYear = new Date(dateFlag.value).getFullYear();
    const entryMonth = new Date(dateFlag.value).getMonth();

    if (entryMonth < 4) {
      beginningDate = new Date(entryYear - 1, 9, 1).getTime();
      endingDate = new Date(entryYear, 1, 28).getTime();
    } else {
      beginningDate = new Date(entryYear, 9, 1).getTime();
      endingDate = new Date(entryYear + 1, 1, 28).getTime();
    }
  }
  //console.log('Beginning date is: ', beginningDate);
  //console.log('Ending date is: ', endingDate);
  return [beginningDate, endingDate];
});
const viewport = ref({ start: timelineRange.value[0], end: timelineRange.value[1] });
const maxRange = ref({ start: timelineRange.value[0], end: timelineRange.value[1] });
const viewportSize = computed(() => viewport.value.end - viewport.value.start);
/* discarded functions kept for possible future use
//Discarded because I made adding items start with the most recent entry rather that the oldest. This made checking the status of future versions obsolete.
function assignStatus(supervisor_id, version_uploader_id, version_entry_id, version_upload_date) {
  if (isSupervisor(supervisor_id, version_uploader_id)) {return 'status-supervisor';}
  else {
    console.log('Not a supervisor. The date I am looking for is: ', version_upload_date);
    return wasReviewed(version_entry_id, version_upload_date);
  }
}
//Made for the function above
function wasReviewed(version_entry_id, version_upload_date) {
  const supervisor_id = timelineData.value.supervisor_user_data_id;
  const timestamp = Date.parse(version_upload_date);
  console.log('This is the date I am trying to find:', timestamp);
  matchChapterAndVersion(version_entry_id, timestamp);
  if (matched_json_chapter.value && matched_json_version.value) {
    console.log('I FOUND YOU, FAKER',matched_json_chapter.value, matched_json_version.value);
    return 'status-student-reviewed';
  }
  else {
    return 'status-student-pending';
  }
}
*/


onMounted(async () => {
  await fetchTimeline();
  // processDataEntries is now called inside fetchTimeline after data is loaded
});
</script>

<template>
  <div class="wrapper">
    <!-- Back button for promoters only - separate container -->
    <div v-if="authStore.isPromoter" class="back-btn-container">
      <button class="back-btn-external" @click="goBack">
        <span>←</span>
        Powrót
      </button>
    </div>
    <div>
      <!-- Other content -->
      <ToggleTextBox
          content="This is some helpful information that appears when you click the button."
      />
    </div>
    <div class="card timeline-card">
      <Timeline
          ref="timelineRef"
          class="timeline"
          :groups="groups"
          :items="items"
          :viewportMin="timelineRange[0]"
          :viewportMax="timelineRange[1]"
          :markers="markers"
          @mousemoveTimeline="onMousemoveTimeline"
          @mouseleaveTimeline="onMouseleaveTimeline"
          @click="displayItemInformation"
          @changeViewport="viewport = $event"
      >
        <template #marker="{item}">
          <div class="marker-content">
            {{ new Date(item.start).toLocaleString() }}
          </div>
        </template>
        <template #item="{item}">
          <div class="tally-content">
            {{ item.tally}}
          </div>
        </template>
      </Timeline>
      <div class="controls">
        <button @click="viewport.start > maxRange.start && timelineRef.setViewport(viewport.start - viewportSize * 0.2, viewport.end - viewportSize * 0.2)">
          Move left
        </button>
        <button @click="viewport.end + viewportSize * 0.2 < maxRange.end && timelineRef.setViewport(viewport.start + viewportSize * 0.2, viewport.end + viewportSize * 0.2)">
          Move right
        </button>
        <button @click="timelineRef.setViewport(viewport.start - viewportSize * 0.2, viewport.end + viewportSize * 0.2)">
          Zoom out
        </button>
        <button @click="timelineRef.setViewport(viewport.start + viewportSize * 0.2, viewport.end - viewportSize * 0.2)">
          Zoom in
        </button>
        <button @click="timelineRef.setViewport(maxRange.start, maxRange.end)">
          Set viewport to max range
        </button>
      </div>
    </div>
  
  <div class="info-card" v-if="matched_json_chapter && matched_json_version">
    <div class="selected-item">
      <p><strong>Selected Chapter:</strong> {{ matched_json_chapter.name }}</p>
      <p><strong>Author:</strong> {{ matched_json_chapter.author.user_data_first_name }} {{ matched_json_chapter.author.user_data_last_name }}</p>
      <p><strong>Email:</strong> {{ matched_json_chapter.author.user_data_email }}</p>

        <div>
          <p><strong>Uploaded on:</strong> {{ new Date(new Date(matched_json_version.upload_date_time).getTime() + 7200000).toISOString().replace('T', ' ').split('.')[0]  }}</p>
          <p><strong>Uploaded by:</strong> {{ matched_json_version.uploader.user_data_first_name }} {{ matched_json_version.uploader.user_data_last_name }}</p>
          <p v-if="matched_json_version.uploader.user_data_id == timelineData.supervisor_user_data_id"><strong>Checklist Tally:</strong> {{ matched_json_version.checklist_tally.resolved + '/' + matched_json_version.checklist_tally.total }}</p>
          <p v-if="matched_json_version.supervisor_comment  !== 'n/a'"><strong>Supervisor Comment:</strong> {{ matched_json_version.supervisor_comment }}</p>
          <p v-if="matched_json_version.file_link"><a :href="matched_json_version.file_link" target="_blank">File Link</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../css/Timeline.css"></style>